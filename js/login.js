// === GESTIÓN DE AUTENTICACIÓN ===

// Función para obtener usuarios del localStorage
function obtenerUsuarios() {
    return JSON.parse(localStorage.getItem('usuarios') || '[]');
}

// Función para generar ID único
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Función para obtener permisos por rol (misma lógica que usuarios.js)
function obtenerPermisosPorRol(rol) {
    const permisos = {
        'administrador': {
            dashboard: true,
            salas: true,
            ventas: true,
            gastos: true,
            stock: true,
            reportes: true,
            usuarios: true,
            ajustes: true
        },
        'supervisor': {
            dashboard: true,
            salas: true,
            ventas: true,
            gastos: true,
            stock: true,
            reportes: true,
            usuarios: false,
            ajustes: false
        },
        'operador': {
            dashboard: true,
            salas: true,
            ventas: true,
            gastos: false,
            stock: true,
            reportes: false,
            usuarios: false,
            ajustes: false
        },
        'vendedor': {
            dashboard: true,
            salas: false,
            ventas: true,
            gastos: false,
            stock: false,
            reportes: false,
            usuarios: false,
            ajustes: false
        }
    };
    
    return permisos[rol.toLowerCase()] || {};
}

// Función para inicializar usuarios (sin datos de prueba)
function inicializarUsuarios() {
    const usuarios = obtenerUsuarios();
    console.log('Sistema iniciado. Usuarios registrados:', usuarios.length);
    return usuarios;
}

// Función para autenticar usuario
function autenticarUsuario(email, password) {
    console.log('Intentando autenticar:', email);
    const usuarios = obtenerUsuarios();
    console.log('Usuarios disponibles para autenticación:', usuarios.length);
    
    const usuario = usuarios.find(u => {
        const emailMatch = u.email.toLowerCase() === email.toLowerCase();
        const passwordMatch = u.password === password;
        const estadoActivo = u.estado === 'activo';
        
        console.log('Verificando usuario:', u.email, {
            emailMatch,
            passwordMatch,
            estadoActivo,
            estado: u.estado
        });
        
        return emailMatch && passwordMatch && estadoActivo;
    });
    
    if (usuario) {
        console.log('Usuario autenticado correctamente:', usuario.nombre);
        // Actualizar último acceso
        usuario.ultimoAcceso = new Date().toISOString();
        const usuariosActualizados = usuarios.map(u => u.id === usuario.id ? usuario : u);
        localStorage.setItem('usuarios', JSON.stringify(usuariosActualizados));
        
        // Guardar sesión
        const sesion = {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol,
            permisos: usuario.permisos,
            fechaLogin: new Date().toISOString()
        };
        
        localStorage.setItem('sesionActual', JSON.stringify(sesion));
        return { success: true, usuario: sesion };
    }
    
    console.log('Autenticación fallida');
    return { success: false, mensaje: 'Credenciales incorrectas o usuario inactivo' };
}

// Función para cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('sesionActual');
    window.location.href = 'login.html';
}

// Función para verificar si hay sesión activa
function verificarSesion() {
    const sesion = localStorage.getItem('sesionActual');
    return sesion ? JSON.parse(sesion) : null;
}

// Función para mostrar alertas
function mostrarAlerta(tipo, mensaje) {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const tipoClases = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    };
    
    const iconos = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-triangle',
        'warning': 'fas fa-exclamation-circle',
        'info': 'fas fa-info-circle'
    };
    
    const alerta = document.createElement('div');
    alerta.id = alertId;
    alerta.className = `alert ${tipoClases[tipo]} alert-custom alert-dismissible fade show`;
    alerta.innerHTML = `
        <i class="${iconos[tipo]} me-2"></i>
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alerta);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            const bsAlert = new bootstrap.Alert(alertElement);
            bsAlert.close();
        }
    }, 5000);
}

// Función para cargar usuarios disponibles para login
function cargarUsuariosDisponibles() {
    const usuarios = obtenerUsuarios();
    console.log('Todos los usuarios:', usuarios);
    
    const usuariosActivos = usuarios.filter(u => u.estado === 'activo');
    console.log('Usuarios activos:', usuariosActivos);
    
    const usuariosContainer = document.getElementById('usuariosDisponibles');
    
    if (!usuariosContainer) {
        console.error('No se encontró el contenedor usuariosDisponibles');
        return;
    }
    
    const badges = {
        'administrador': 'bg-danger',
        'supervisor': 'bg-warning',
        'operador': 'bg-info',
        'vendedor': 'bg-success'
    };
    
    if (usuariosActivos.length === 0) {
        usuariosContainer.innerHTML = `
            <div class="text-center p-3">
                <i class="fas fa-exclamation-triangle text-warning mb-2"></i>
                <p class="mb-0">No hay usuarios activos en el sistema</p>
                <small class="text-muted">Total usuarios: ${usuarios.length}</small>
            </div>
        `;
        return;
    }
    
    console.log('Generando HTML para usuarios activos...');
    usuariosContainer.innerHTML = usuariosActivos.map(usuario => `
        <div class="user-item" onclick="llenarCredenciales('${usuario.email}')">
            <div>
                <strong>${usuario.nombre}</strong>
                <br>
                <small class="text-muted">${usuario.email}</small>
            </div>
            <span class="badge ${badges[usuario.rol] || 'bg-secondary'}">${usuario.rol}</span>
        </div>
    `).join('');
    
    console.log('Usuarios cargados en la interfaz');
}

// Función para llenar credenciales automáticamente (solo email por seguridad)
function llenarCredenciales(email) {
    document.getElementById('email').value = email;
    document.getElementById('password').focus();
    
    // Agregar efecto visual
    const emailInput = document.getElementById('email');
    emailInput.classList.add('border-success');
    
    setTimeout(() => {
        emailInput.classList.remove('border-success');
    }, 1000);
    
    mostrarAlerta('info', 'Email cargado. Ingresa tu contraseña para continuar.');
}

// Función para mostrar información del sistema
function mostrarInformacionSistema() {
    const usuarios = obtenerUsuarios();
    const usuariosActivos = usuarios.filter(u => u.estado === 'activo').length;
    const totalUsuarios = usuarios.length;
    
    mostrarAlerta('info', 
        `Sistema GameControl - ${totalUsuarios} usuarios registrados, ${usuariosActivos} activos. ` +
        'Para obtener credenciales, contacta al administrador del sistema.'
    );
}

// Función para mostrar ayuda
function mostrarAyuda() {
    mostrarInformacionSistema();
}

// Función para manejar el envío del formulario
function manejarLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email').trim();
    const password = formData.get('password');
    const remember = formData.get('remember');
    
    // Validaciones básicas
    if (!email || !password) {
        mostrarAlerta('error', 'Por favor completa todos los campos');
        return;
    }
    
    // Mostrar loading
    const btnLogin = document.querySelector('.btn-login');
    btnLogin.classList.add('loading');
    
    // Simular delay de autenticación (en producción esto sería una llamada al servidor)
    setTimeout(() => {
        const resultado = autenticarUsuario(email, password);
        
        if (resultado.success) {
            // Guardar "recordarme" si está marcado
            if (remember) {
                localStorage.setItem('recordarUsuario', email);
            } else {
                localStorage.removeItem('recordarUsuario');
            }
            
            mostrarAlerta('success', `¡Bienvenido, ${resultado.usuario.nombre}! Redirigiendo al dashboard...`);
            
            // Redireccionar después de 2.5 segundos para dar tiempo a leer el mensaje
            setTimeout(() => {
                console.log('Redirigiendo a dashboard...');
                window.location.href = 'index.html';
            }, 2500);
        } else {
            mostrarAlerta('error', resultado.mensaje);
            btnLogin.classList.remove('loading');
            
            // Limpiar contraseña por seguridad
            document.getElementById('password').value = '';
        }
    }, 1000);
}

// Función para cargar email recordado
function cargarEmailRecordado() {
    const emailRecordado = localStorage.getItem('recordarUsuario');
    if (emailRecordado) {
        document.getElementById('email').value = emailRecordado;
        document.getElementById('remember').checked = true;
    }
}

// Función para verificar si ya hay sesión activa
function verificarSesionExistente() {
    const sesion = verificarSesion();
    if (sesion) {
        // Si ya hay sesión activa, mostrar opción de continuar o cerrar sesión
        const continuarSesion = confirm(
            `Ya tienes una sesión activa como ${sesion.nombre}.\n\n` +
            `¿Quieres continuar con esa sesión?\n\n` +
            `• Aceptar: Ir al dashboard\n` +
            `• Cancelar: Cerrar sesión e iniciar nueva`
        );
        
        if (continuarSesion) {
            mostrarAlerta('info', `Continuando sesión como ${sesion.nombre}...`);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            // Cerrar sesión actual
            localStorage.removeItem('sesionActual');
            mostrarAlerta('success', 'Sesión anterior cerrada. Puedes iniciar una nueva sesión.');
        }
        return true;
    }
    return false;
}

// Función para limpiar sesiones conflictivas
function limpiarSesionesConflictivas() {
    console.log('Limpiando posibles sesiones conflictivas...');
    
    // Verificar si hay múltiples tipos de sesiones almacenadas
    const sesionPrincipal = localStorage.getItem('sesionActual');
    const sesionSalas = localStorage.getItem('salas_current_session');
    
    if (sesionSalas && !sesionPrincipal) {
        console.log('Encontrada sesión de sistema secundario sin sesión principal, limpiando...');
        localStorage.removeItem('salas_current_session');
    }
    
    console.log('Estado de sesiones después de limpieza:', {
        sesionPrincipal: !!sesionPrincipal,
        sesionSalas: !!localStorage.getItem('salas_current_session')
    });
}

// Event listeners y inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Limpiar sesiones conflictivas primero
    limpiarSesionesConflictivas();
    
    // Crear usuarios por defecto inmediatamente al cargar la página
    inicializarUsuarios();
    console.log('Página cargada, usuarios inicializados');
    
    // Verificar si ya hay sesión activa
    if (!verificarSesionExistente()) {
        // Cargar usuarios disponibles para login
        cargarUsuariosDisponibles();
        
        // Cargar email recordado
        cargarEmailRecordado();
        
        // Configurar formulario
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', manejarLogin);
        
        // Focus en el primer campo vacío
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (!emailInput.value) {
            emailInput.focus();
        } else {
            passwordInput.focus();
        }
        
        // Permitir login con Enter
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !document.querySelector('.btn-login').classList.contains('loading')) {
                loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });
        
        // Efecto de tipeo en campos
        [emailInput, passwordInput].forEach(input => {
            input.addEventListener('input', () => {
                if (input.value.length > 0) {
                    input.classList.add('border-primary');
                } else {
                    input.classList.remove('border-primary');
                }
            });
        });
    }
});

// Función para reiniciar datos (depuración)
function reiniciarDatos() {
    console.log('Reiniciando datos del localStorage...');
    localStorage.clear();
    console.log('LocalStorage limpiado');
    
    // Recrear usuarios
    inicializarUsuarios();
    
    // Recargar la lista de usuarios disponibles para login
    cargarUsuariosDisponibles();
    
    mostrarAlerta('success', 'Datos reiniciados correctamente. Usuarios del sistema recreados.');
}

// Función para depurar estado actual
function depurarEstado() {
    console.log('=== ESTADO ACTUAL DEL SISTEMA ===');
    const usuarios = obtenerUsuarios();
    console.log('Total usuarios:', usuarios.length);
    console.log('Usuarios:', usuarios);
    console.log('Usuarios activos:', usuarios.filter(u => u.estado === 'activo'));
    console.log('Usuarios inactivos:', usuarios.filter(u => u.estado !== 'activo'));
    
    mostrarAlerta('info', `Sistema: ${usuarios.length} usuarios total, ${usuarios.filter(u => u.estado === 'activo').length} activos. Ver consola para detalles.`);
}

// Funciones globales para uso en HTML
window.llenarCredenciales = llenarCredenciales;
window.mostrarAyuda = mostrarAyuda;
window.mostrarInformacionSistema = mostrarInformacionSistema;
window.cerrarSesion = cerrarSesion;
window.verificarSesion = verificarSesion;
window.reiniciarDatos = reiniciarDatos;
window.depurarEstado = depurarEstado; 