// EJECUTAR ESTO EN LA CONSOLA DEL NAVEGADOR (F12 → Console)
// Copiar y pegar todo esto:

localStorage.clear();
sessionStorage.clear();
console.log('✅ Cache borrado');
console.log('⏳ Refrescando página en 2 segundos...');
setTimeout(() => {
    location.reload();
}, 2000);
