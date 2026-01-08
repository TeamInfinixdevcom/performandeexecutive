class SalesTracking {
    constructor() {
        this.userId = null;
        this.userEmail = null;
        this.currentYear = new Date().getFullYear();
        this.firebaseImported = false;
        this.firestoreModule = null;
    }

    async _ensureFirebaseImported() {
        if (!this.firebaseImported) {
            this.firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            this.firebaseImported = true;
        }
        return this.firestoreModule;
    }

    async init(userId, userEmail) {
        this.userId = userId;
        this.userEmail = userEmail;
        await this._ensureFirebaseImported();
        console.log('SalesTracking init:', userId);
    }

    async getUserMeta() {
        try {
            const { doc, getDoc } = await this._ensureFirebaseImported();
            const metaRef = doc(window.db, 'metas_ventas_anuales', this.userId);
            const metaSnap = await getDoc(metaRef);
            if (metaSnap.exists()) {
                const data = metaSnap.data();
                console.log('📖 Meta encontrada:', data);
                return data;
            }
            console.log('ℹ️ No hay meta guardada aún');
            return null;
        } catch (error) {
            console.error('❌ Error obteniendo meta:', error);
            return null;
        }
    }

    async setUserMeta(metaValue) {
        try {
            const { doc, getDoc, setDoc } = await this._ensureFirebaseImported();
            console.log('💾 Guardando meta:', metaValue, 'para userId:', this.userId);
            const metaRef = doc(window.db, 'metas_ventas_anuales', this.userId);
            
            // Verificar si existe para preservar createdAt
            const existingMeta = await getDoc(metaRef);
            const now = new Date().toISOString();
            
            const metaData = {
                executiveId: this.userId,
                executiveEmail: this.userEmail,
                annualGoal: parseInt(metaValue),
                year: this.currentYear,
                updatedAt: now
            };
            
            // Si no existe, agregar createdAt
            if (!existingMeta.exists()) {
                metaData.createdAt = now;
            }
            
            await setDoc(metaRef, metaData, { merge: true });
            console.log('✅ Meta guardada exitosamente en Firestore:', metaValue);
            return true;
        } catch (error) {
            console.error('❌ Error guardando meta:', error);
            return false;
        }
    }

    async registerSale(saleData) {
        try {
            const { collection, doc, setDoc } = await this._ensureFirebaseImported();
            const { orderNumber, type, clientName, cedula, categories, incluyeLineaPrepago, incluyeTelefono, incluyeAccesorio, deviceIMEIs, accesorios } = saleData;

            if (!orderNumber || !type || !clientName || !cedula || !categories || categories.length === 0) {
                return { success: false, error: 'Required fields missing' };
            }

            const saleDocRef = doc(collection(window.db, 'pedidos_ventas'));
            const saleId = saleDocRef.id;

            await setDoc(saleDocRef, {
                id: saleId,
                executiveId: this.userId,
                executiveEmail: this.userEmail,
                orderNumber: orderNumber.toUpperCase(),
                type: type,
                clientName: clientName.toUpperCase(),
                cedula: cedula,
                categories: categories,
                incluyeLineaPrepago: incluyeLineaPrepago === true,
                incluyeTelefono: incluyeTelefono === true,
                incluyeAccesorio: incluyeAccesorio === true,
                deviceIMEIs: incluyeTelefono && deviceIMEIs ? deviceIMEIs : null,
                accesorios: incluyeAccesorio && accesorios ? accesorios : null,
                status: 'PENDIENTE',
                year: this.currentYear,
                registeredAt: new Date().toISOString(),
                completedAt: null
            });

            console.log('Sale registered:', saleId);
            return { success: true, id: saleId };
        } catch (error) {
            console.error('Error:', error);
            return { success: false, error: error.message };
        }
    }

    async completeSale(saleId) {
        try {
            const { doc, updateDoc, getDoc } = await this._ensureFirebaseImported();
            const saleDocRef = doc(window.db, 'pedidos_ventas', saleId);
            
            // Obtener datos de la venta para saber el año
            const saleSnap = await getDoc(saleDocRef);
            if (!saleSnap.exists()) {
                return false;
            }
            
            const saleData = saleSnap.data();
            const year = saleData.year || new Date().getFullYear();
            
            // Marcar como completada
            await updateDoc(saleDocRef, {
                status: 'COMPLETADA',
                completedAt: new Date().toISOString()
            });
            console.log('Sale completed:', saleId);
            
            // Actualizar contadores en metas_desglosadas (semestre 1 por defecto)
            await this.updateCompletadoCounts(this.userId, year, 1);
            
            return true;
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    }

    async deleteSale(saleId) {
        try {
            const { doc, deleteDoc } = await this._ensureFirebaseImported();
            const saleDocRef = doc(window.db, 'pedidos_ventas', saleId);
            await deleteDoc(saleDocRef);
            console.log('Sale deleted:', saleId);
            return true;
        } catch (error) {
            console.error('Error deleting sale:', error);
            return false;
        }
    }

    async getAllSales() {
        try {
            const { collection, query, where, getDocs, getDocsFromServer } = await this._ensureFirebaseImported();
            const q = query(
                collection(window.db, 'pedidos_ventas'),
                where('executiveId', '==', this.userId)
            );
            
            // Intentar obtener del servidor primero para datos frescos
            let snapshot;
            try {
                snapshot = await getDocsFromServer(q);
                console.log('✅ Datos obtenidos del servidor (frescos)');
            } catch (serverError) {
                console.warn('⚠️ No se pudo obtener del servidor, usando cache:', serverError);
                snapshot = await getDocs(q);
            }

            const sales = [];
            snapshot.forEach(doc => {
                sales.push({ id: doc.id, ...doc.data() });
            });
            console.log(`📊 Total de ventas obtenidas: ${sales.length}`);
            return sales;
        } catch (error) {
            console.error('❌ Error en getAllSales:', error);
            return [];
        }
    }

    async getSalesMetrics() {
        try {
            const sales = await this.getAllSales();
            const meta = await this.getUserMeta();

            const completedSales = sales.filter(s => s.status === 'COMPLETADA');
            // Un pedido tiene dispositivo si incluye teléfono (terminal) o accesorio
            const withDevice = completedSales.filter(s => 
                s.incluyeTelefono === true || 
                s.incluyeAccesorio === true || 
                (s.deviceIMEIs && s.deviceIMEIs.length > 0) ||
                (s.accesorios && s.accesorios.length > 0)
            ).length;
            const withoutDevice = completedSales.length - withDevice;

            const metrics = {
                totalSales: sales.length,
                completedSales: completedSales.length,
                pendingSales: sales.filter(s => s.status === 'PENDIENTE').length,
                withDevice: withDevice,
                withoutDevice: withoutDevice,
                annualGoal: meta?.annualGoal || 0,
                progressPercentage: meta?.annualGoal ? Math.round((completedSales.length / meta.annualGoal) * 100) : 0,
                remainingGoal: meta ? Math.max(0, meta.annualGoal - completedSales.length) : 0
            };

            return metrics;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }

    onSalesUpdated(callback) {
        try {
            // Note: This is async but we return immediately for setup
            this._ensureFirebaseImported().then(({ collection, query, where, onSnapshot }) => {
                const q = query(
                    collection(window.db, 'pedidos_ventas'),
                    where('executiveId', '==', this.userId)
                );
                
                return onSnapshot(q, snapshot => {
                    const sales = [];
                    snapshot.forEach(doc => {
                        sales.push({ id: doc.id, ...doc.data() });
                    });
                    callback(sales);
                });
            }).catch(error => {
                console.error('Error:', error);
            });
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }

    async updateCompletadoCounts(userId, year, semestre) {
        try {
            const { doc, getDoc, getDocs, query, collection, where, setDoc } = await this._ensureFirebaseImported();
            
            // Obtener todas las ventas del usuario completadas
            const salesQuery = query(
                collection(window.db, 'pedidos_ventas'),
                where('executiveId', '==', userId),
                where('status', '==', 'COMPLETADA')
            );
            
            const salesSnapshot = await getDocs(salesQuery);
            
            // Contar por categoría
            const counts = {
                renovacion: 0,
                servicioNuevo: 0,
                ventaTerminal: 0,
                ventaAccesorio: 0
            };
            
            salesSnapshot.forEach(saleDoc => {
                const sale = saleDoc.data();
                if (sale.categories && Array.isArray(sale.categories)) {
                    sale.categories.forEach(cat => {
                        if (counts.hasOwnProperty(cat)) {
                            // ✅ MEJORADO: Contar por cantidad de items, no solo por categoría
                            if (cat === 'ventaTerminal' && sale.deviceIMEIs && Array.isArray(sale.deviceIMEIs)) {
                                // Contar cada IMEI como una venta de terminal
                                counts[cat] += sale.deviceIMEIs.length;
                            } else if (cat === 'ventaAccesorio' && sale.accesorios && Array.isArray(sale.accesorios)) {
                                // Contar cada accesorio como una venta de accesorio
                                counts[cat] += sale.accesorios.length;
                            } else {
                                // Para otras categorías (renovación, servicio nuevo), contar 1 por venta
                                counts[cat]++;
                            }
                        }
                    });
                }
            });
            
            // Actualizar metas_desglosadas (usar setDoc con merge para crear si no existe)
            const metaDocKey = `${userId}_${year}_${semestre}`;
            const metaRef = doc(window.db, 'metas_desglosadas', metaDocKey);
            
            await setDoc(metaRef, {
                completado: counts,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log('✅ Contadores actualizados (con cantidad de items):', counts);
            return true;
        } catch (error) {
            console.error('❌ Error actualizando contadores:', error);
            return false;
        }
    }

    destroy() {
        console.log('SalesTracking destroyed');
    }
}

window.SalesTracking = SalesTracking;
let salesTracking = null;

export { SalesTracking };
