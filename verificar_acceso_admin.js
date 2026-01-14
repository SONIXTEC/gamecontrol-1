// Script para verificar y garantizar acceso total del administrador
console.log('🔧 Verificando acceso de administrador...');

// Función para verificar permisos del usuario actual
function verificarPermisosActuales() {
    const sesion = JSON.parse(localStorage.getItem('sesionActual') || 'null');
    
    if (!sesion) {
        console.log('❌ No hay sesión activa');
        return false;
    }
    
    console.log('👤 Usuario actual:', sesion.nombre);
    console.log('📧 Email:', sesion.email);
    console.log('🔑 Rol:', sesion.rol);
    console.log('✅ Permisos:', sesion.permisos);
    
    return sesion;
}

// Función para garantizar acceso total a administrador
function garantizarAccesoAdministrador(email = 'maurochica23@gmail.com') {
    console.warn('⚠️ Supabase-only: este script ya no modifica usuarios en localStorage.');
    console.warn('➡️ Para garantizar permisos admin, actualiza el usuario en la tabla `usuarios` (Supabase) o usa una función/SQL con permisos.');
    
    // Actualizar sesión si es el usuario actual
    const sesionActual = JSON.parse(localStorage.getItem('sesionActual') || 'null');
    if (sesionActual && sesionActual.email === email) {
        console.warn('⚠️ La sesión local no cambia permisos reales en Supabase. Re-loguea después de cambiar rol/permisos en la BD.');
    }

    return false;
}

// Función para probar acceso a todas las páginas
function probarAccesoCompleto() {
    const paginas = [
        'index.html',
        'pages/salas.html',
        'pages/ventas.html', 
        'pages/gastos.html',
        'pages/stock.html',
        'pages/reportes.html',
        'pages/usuarios.html',
        'pages/ajustes.html'
    ];
    
    console.log('🧪 Probando acceso a todas las páginas...');
    
    paginas.forEach(pagina => {
        const modulo = pagina.split('/').pop().replace('.html', '');
        const tieneAcceso = window.verificarPermiso ? window.verificarPermiso(modulo) : 'Función no disponible';
        console.log(`📄 ${pagina}: ${tieneAcceso ? '✅ ACCESO' : '❌ BLOQUEADO'}`);
    });
}

// Función para mostrar estado completo del sistema
function mostrarEstadoSistema() {
    console.log('=== ESTADO COMPLETO DEL SISTEMA ===');
    
    // Verificar usuario actual
    const sesionActual = verificarPermisosActuales();
    
    console.log('\n👥 TODOS LOS USUARIOS:');
    console.log('Supabase-only: revisa la tabla `usuarios` en Supabase o la pantalla Usuarios.');
    
    // Probar funciones de acceso
    console.log('\n🔍 VERIFICACIONES DE ACCESO:');
    if (typeof window.verificarPermiso === 'function') {
        probarAccesoCompleto();
    } else {
        console.log('⚠️ Funciones de verificación no disponibles. Cargar desde una página del sistema.');
    }
}

// Función para limpiar y reinicializar
function reinicializarSistema() {
    console.log('🔄 Reinicializando sistema...');
    
    // Garantizar acceso de administrador
    garantizarAccesoAdministrador();
    
    // Recargar página para aplicar cambios
    console.log('🔄 Recargando página para aplicar cambios...');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Hacer funciones disponibles globalmente
window.verificarPermisosActuales = verificarPermisosActuales;
window.garantizarAccesoAdministrador = garantizarAccesoAdministrador;
window.probarAccesoCompleto = probarAccesoCompleto;
window.mostrarEstadoSistema = mostrarEstadoSistema;
window.reinicializarSistema = reinicializarSistema;

// Ejecutar verificación automática
console.log('🚀 Script cargado. Funciones disponibles:');
console.log('• verificarPermisosActuales() - Ver permisos del usuario actual');
console.log('• garantizarAccesoAdministrador() - Asegurar acceso total');
console.log('• probarAccesoCompleto() - Probar acceso a todas las páginas');
console.log('• mostrarEstadoSistema() - Ver estado completo');
console.log('• reinicializarSistema() - Limpiar y reinicializar');

// Verificación automática
verificarPermisosActuales();
garantizarAccesoAdministrador(); 