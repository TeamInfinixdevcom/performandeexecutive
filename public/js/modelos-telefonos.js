/**
 * MODELOS DE TELÉFONOS - Base de datos de modelos para autocompletado
 * Actualizado desde inventario real
 */

const MODELOS_TELEFONOS = {
  "APPLE": [
    "APPLE ADAPTADOR DINAMICO 40W BLANCO",
    "APPLE AIRPODS 4 CANCELACION DE RUIDO BLANCO",
    "APPLE AIRTAG 1 PACK BLANCO",
    "APPLE CABLE DE CARGA USB-C 240W BLANCO",
    "APPLE IPAD A16 11 WIFI 128GB AZUL",
    "APPLE IPAD A16 11 WIFI 256GB PLATA",
    "APPLE POWER ADAPTER BLANCO",
    "IPHONE 13 NEGRO 128GB-LAE",
    "IPHONE 15 NEGRO 128GB",
    "IPHONE 15 ROSADO 128GB",
    "IPHONE 16 128GB BLANCO",
    "IPHONE 16 128GB NEGRO",
    "IPHONE 16 PRO MAX 256GB TITANIO NEGRO",
    "IPHONE 17 256GB BLANCO",
    "IPHONE 17 256GB NEGRO",
    "IPHONE 17 PRO 256GB AZUL PROFUNDO",
    "IPHONE 17 PRO 256GB NARANJA COSMICO",
    "IPHONE 17 PRO 256GB PLATA",
    "IPHONE AIR 256GB BLANCO NUBE",
    "IPHONE AIR 256GB NEGRO ESPACIAL",
    "IPHONE AIR 256GB ORO CLARO"
  ],
  "BEATS": [
    "BEATS SOLO BUDS NEGRO",
    "BEATS SOLO BUDS ROJO",
    "BEATS STUDIO PRO ARENA",
    "BEATS STUDIO PRO AZUL MARINO"
  ],
  "HONOR": [
    "HONOR 400 512GB DORADO DUNA",
    "HONOR 400 512GB NEGRO MEDIANOCHE",
    "HONOR 400 512GB PLATA METEORO",
    "HONOR 400 LITE 256GB GRIS ROCA LUNAR",
    "HONOR 400 LITE 256GB NEGRO NOCTURNO",
    "HONOR 400 PRO 512GB GRIS LUNAR",
    "HONOR 400 PRO 512GB NEGRO MEDIANOCHE",
    "HONOR BAND 10 NEGRO",
    "HONOR MAGIC 7 LITE 256GB TITANIO MORADO",
    "HONOR MAGIC 7 PRO 512GB GRIS LUNAR",
    "HONOR MAGIC V3 512GB VERDE",
    "HONOR WATCH 4 PRO NEGRO",
    "HONOR WATCH 5 NEGRO",
    "HONOR X6C 256GB NEGRO MEDIANOCHE",
    "HONOR X7C 256GB BLANCO LUNAR",
    "HONOR X7D 5G 256GB AZUL CYAN",
    "HONOR X7D 5G 256GB NEGRO NOCTURNO",
    "HONOR X8B 256GB AQUAMARINO",
    "HONOR X8B 256GB PLATEADO",
    "HONOR X8C 256GB NEGRO MEDIANOCHE",
    "HONOR X8C 256GB VERDE MARINO"
  ],
  "HUAWEI": [
    "HUAWEI BAND 10 AZUL",
    "HUAWEI BAND 10 BLANCO",
    "HUAWEI BAND 10 MORADO",
    "HUAWEI BAND 10 NEGRO",
    "HUAWEI FREECLIP MORADO",
    "HUAWEI MIFI E5783-230A BLANCO",
    "HUAWEI WATCH D2 NEGRO",
    "HUAWEI WATCH FIT 4 BLANCO",
    "HUAWEI WATCH FIT 4 MORADO",
    "HUAWEI WATCH FIT 4 NEGRO",
    "HUAWEI WATCH GT5 PRO 46MM NEGRO",
    "HUAWEI WATCH GT6 PRO 46MM NEGRO"
  ],
  "MOTOROLA": [
    "MOTOROLA EDGE 50 FUSION 256GB ROSA FRAGOLA",
    "MOTOROLA EDGE 60 FUSION 5G 256GB AZUL",
    "MOTOROLA EDGE 60 FUSION 5G 256GB VERDE",
    "MOTOROLA MOTO BUDS AZUL",
    "MOTOROLA MOTO G24 POWER 256GB CELESTE",
    "MOTOROLA MOTO G35 5G 256GB NEGRO",
    "MOTOROLA MOTO G35 5G 256GB VERDE",
    "MOTOROLA MOTO G56 5G 256GB AZUL MARINO",
    "MOTOROLA MOTO G56 5G 256GB GRIS",
    "MOTOROLA MOTO G85 256GB GRIS",
    "MOTOROLA MOTO TAG AZUL"
  ],
  "OPPO": [
    "OPPO A5 PRO 5G 256GB CAFÉ",
    "OPPO A5 PRO 5G 256GB ROSA"
  ],
  "SAMSUNG": [
    "SAMSUNG A06 5G 128GB GRIS CLARO",
    "SAMSUNG A06 5G 128GB NEGRO",
    "SAMSUNG A07 LTE 128GB VERDE",
    "SAMSUNG A17 5G 256GB AZUL",
    "SAMSUNG A17 5G 256GB GRIS",
    "SAMSUNG A26 5G 256GB BLANCO",
    "SAMSUNG A26 5G 256GB NEGRO",
    "SAMSUNG A36 5G 256GB BLANCO",
    "SAMSUNG A36 5G 256GB NEGRO",
    "SAMSUNG A36 5G 256GB VIOLETA CLARO",
    "SAMSUNG A56 5G 256GB GRIS CLARO",
    "SAMSUNG A56 5G 256GB NEGRO",
    "SAMSUNG A56 5G 256GB VERDE OLIVO",
    "SAMSUNG BANDA FIT3 GRIS",
    "SAMSUNG BANDA FIT3 ORO ROSA",
    "SAMSUNG BUDS3 BLANCO",
    "SAMSUNG BUDS3 PLATA",
    "SAMSUNG BUDS3 PRO BLANCO",
    "SAMSUNG CUBO DE CARGA 25W NEGRO",
    "SAMSUNG CUBO DE CARGA 45W NEGRO",
    "SAMSUNG S25 FE 5G 512GB AZUL OSCURO",
    "SAMSUNG S25 FE 5G 512GB CELESTE",
    "SAMSUNG S25 ULTRA 512GB TITANIO GRIS",
    "SAMSUNG S25+ 512GB CELESTE",
    "SAMSUNG S25+ 512GB PLATA",
    "SAMSUNG TAB A9 EE 128GB GRIS",
    "SAMSUNG TAB A9+ 5G 128GB GRIS",
    "SAMSUNG Z FLIP7 512GB AZUL",
    "SAMSUNG Z FOLD7 512GB AZUL",
    "SAMSUNG Z FOLD7 512GB PLATEADO"
  ],
  "XIAOMI": [
    "XIAOMI 15T 512GB NEGRO",
    "XIAOMI 15T PRO 512GB NEGRO",
    "XIAOMI REDMI 15 5G 256GB NEGRO OCASO",
    "XIAOMI REDMI 15C 5G 256GB VERDE MENTA",
    "XIAOMI REDMI NOTE 14 5G 256GB NEGRO ESTELAR",
    "XIAOMI REDMI NOTE 14 PRO 5G 256GB NEGRO ESTELAR",
    "XIAOMI REDMI NOTE 14 PRO 5G 256GB VERDE CORAL",
    "XIAOMI REDMI NOTE 15 5G 256GB AZUL GLACIAR",
    "XIAOMI REDMI NOTE 15 5G 256GB NEGRO",
    "XIAOMI REDMI NOTE 15 PRO 5G 512GB GRIS TITANIO",
    "XIAOMI REDMI NOTE 15 PRO 5G 512GB NEGRO",
    "XIAOMI REDMI NOTE 15 PRO+ 5G 512GB CAFÉ MOCA",
    "XIAOMI REDMI NOTE 15 PRO+ 5G 512GB NEGRO"
  ]
};

// Almacenar modelos personalizados del usuario
let modelosPersonalizados = {};

/**
 * Obtener modelos según marca
 */
function obtenerModelosPorMarca(marca) {
  const modelosPrecargados = MODELOS_TELEFONOS[marca] || [];
  const personalizados = modelosPersonalizados[marca] || [];
  // Combinar y eliminar duplicados
  return [...new Set([...modelosPrecargados, ...personalizados])].sort();
}

/**
 * Filtrar modelos por texto ingresado
 */
function filtrarModelos(texto, marca) {
  if (!texto || texto.length === 0) {
    return obtenerModelosPorMarca(marca);
  }
  
  const modelos = obtenerModelosPorMarca(marca);
  return modelos.filter(modelo => 
    modelo.toLowerCase().includes(texto.toLowerCase())
  );
}

/**
 * Agregar modelo personalizado
 */
function agregarModeloPersonalizado(marca, modelo) {
  if (!modelo || modelo.trim().length === 0) return false;
  
  if (!modelosPersonalizados[marca]) {
    modelosPersonalizados[marca] = [];
  }
  
  const modeloNormalizado = modelo.trim().toUpperCase();
  if (!modelosPersonalizados[marca].includes(modeloNormalizado)) {
    modelosPersonalizados[marca].push(modeloNormalizado);
    console.log(`✅ Modelo personalizado agregado: ${modeloNormalizado}`);
    return true;
  }
  
  return false;
}

/**
 * Obtener todos los modelos personalizados (para guardado en localStorage)
 */
function obtenerModelosPersonalizados() {
  return modelosPersonalizados;
}

/**
 * Restaurar modelos personalizados desde localStorage
 */
function restaurarModelosPersonalizados() {
  const guardados = localStorage.getItem('modelosPersonalizados');
  if (guardados) {
    try {
      modelosPersonalizados = JSON.parse(guardados);
      console.log('✅ Modelos personalizados restaurados desde localStorage');
    } catch (error) {
      console.warn('⚠️ Error restaurando modelos personalizados:', error);
    }
  }
}

/**
 * Guardar modelos personalizados en localStorage
 */
function guardarModelosPersonalizados() {
  localStorage.setItem('modelosPersonalizados', JSON.stringify(modelosPersonalizados));
}

// Restaurar al cargar el script
restaurarModelosPersonalizados();

console.log('✅ Modelos de teléfonos cargados (lista actualizada del inventario)');

