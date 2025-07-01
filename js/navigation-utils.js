/**
 * Utilidades de Navegación - GameControl
 * Maneja rutas dinámicas para evitar errores 404 en GitHub Pages
 */

// ===================================================================
// DETECCIÓN DE UBICACIÓN Y RUTAS INTELIGENTES
// ===================================================================

class NavigationUtils {
    constructor() {
        this.currentPath = window.location.pathname;
        this.isInPagesFolder = this.currentPath.includes('/pages/');
        this.isLoginPage = this.currentPath.includes('login.html');
        console.log('NavigationUtils inicializado:', {
            currentPath: this.currentPath,
            isInPagesFolder: this.isInPagesFolder,
            isLoginPage: this.isLoginPage
        });
    }

    // Obtener la ruta correcta para login.html
    getLoginPath() {
        if (this.isInPagesFolder) {
            return '../login.html'; // Desde /pages/ ir un nivel arriba
        } else {
            return 'login.html'; // Desde la raíz
        }
    }

    // Obtener la ruta correcta para index.html
    getIndexPath() {
        if (this.isInPagesFolder) {
            return '../index.html'; // Desde /pages/ ir un nivel arriba
        } else {
            return 'index.html'; // Desde la raíz
        }
    }

    // Obtener la ruta correcta para cualquier página en /pages/
    getPagesPath(page) {
        if (this.isInPagesFolder) {
            return page; // Ya estamos en /pages/
        } else {
            return `pages/${page}`; // Desde la raíz ir a /pages/
        }
    }

    // Función de logout inteligente
    logout() {
        const confirmacion = confirm('¿Estás seguro de que deseas cerrar sesión?');
        if (!confirmacion) return;

        try {
            console.log('🚪 Cerrando sesión desde:', this.currentPath);
            
            // Limpiar todas las sesiones
            localStorage.removeItem('sesionActual');
            localStorage.removeItem('salas_current_session');
            
            // Obtener la ruta correcta para login
            const loginPath = this.getLoginPath();
            console.log('🔄 Redirigiendo a:', loginPath);
            
            // Redirigir con pequeño delay para asegurar limpieza
            setTimeout(() => {
                window.location.href = loginPath;
            }, 100);
            
        } catch (error) {
            console.error('❌ Error durante logout:', error);
            // Fallback: forzar ir a la raíz
            window.location.href = '/gamecontrol/login.html';
        }
    }

    // Función de login exitoso inteligente
    loginSuccess() {
        try {
            console.log('✅ Login exitoso desde:', this.currentPath);
            
            // Obtener la ruta correcta para index
            const indexPath = this.getIndexPath();
            console.log('🔄 Redirigiendo a dashboard:', indexPath);
            
            // Redirigir
            setTimeout(() => {
                window.location.href = indexPath;
            }, 100);
            
        } catch (error) {
            console.error('❌ Error durante redirección post-login:', error);
            // Fallback: forzar ir a la raíz
            window.location.href = '/gamecontrol/index.html';
        }
    }

    // Navegar a una página específica
    navigateTo(page) {
        try {
            let targetPath;
            
            if (page === 'login') {
                targetPath = this.getLoginPath();
            } else if (page === 'index' || page === 'dashboard') {
                targetPath = this.getIndexPath();
            } else if (page.includes('.html') && !page.includes('/')) {
                // Es una página en /pages/
                targetPath = this.getPagesPath(page);
            } else {
                // Ruta personalizada
                targetPath = page;
            }
            
            console.log('🚀 Navegando a:', targetPath);
            window.location.href = targetPath;
            
        } catch (error) {
            console.error('❌ Error durante navegación:', error);
        }
    }

    // Verificar si una sesión debe redirigir
    checkAndRedirectIfNeeded() {
        const sesion = localStorage.getItem('sesionActual');
        
        if (this.isLoginPage && sesion) {
            // Está en login pero ya tiene sesión -> ir al dashboard
            console.log('ℹ️ Ya hay sesión activa, redirigiendo al dashboard');
            this.navigateTo('index');
            return true;
        } else if (!this.isLoginPage && !sesion) {
            // No está en login pero no tiene sesión -> ir al login
            console.log('ℹ️ No hay sesión activa, redirigiendo al login');
            this.navigateTo('login');
            return true;
        }
        
        return false;
    }

    // Obtener la URL base correcta para GitHub Pages
    getBaseUrl() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return ''; // Desarrollo local
        } else if (hostname.includes('github.io')) {
            return '/gamecontrol'; // GitHub Pages
        } else {
            return ''; // Otro dominio
        }
    }

    // Función de utilidad para debugging
    debug() {
        console.log('🔍 Navigation Debug Info:');
        console.log('- Current Path:', this.currentPath);
        console.log('- Is in Pages Folder:', this.isInPagesFolder);
        console.log('- Is Login Page:', this.isLoginPage);
        console.log('- Login Path:', this.getLoginPath());
        console.log('- Index Path:', this.getIndexPath());
        console.log('- Base URL:', this.getBaseUrl());
        console.log('- Session Exists:', !!localStorage.getItem('sesionActual'));
    }
}

// ===================================================================
// INSTANCIA GLOBAL
// ===================================================================

// Crear instancia global
window.navigationUtils = new NavigationUtils();

// ===================================================================
// SOBRESCRIBIR FUNCIONES PROBLEMÁTICAS
// ===================================================================

// Sobrescribir la función de logout del AuthSystem
if (typeof window.authSystem !== 'undefined') {
    console.log('🔧 Sobrescribiendo authSystem.logout con navegación inteligente');
    window.authSystem.logout = function() {
        window.navigationUtils.logout();
    };
}

// Función global de logout para compatibilidad
window.cerrarSesionInteligente = function() {
    window.navigationUtils.logout();
};

// Función global de login exitoso para compatibilidad
window.loginExitosoInteligente = function() {
    window.navigationUtils.loginSuccess();
};

// ===================================================================
// AUTO-VERIFICACIÓN AL CARGAR PÁGINA
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 NavigationUtils cargado');
    
    // Verificar y redirigir si es necesario
    setTimeout(() => {
        window.navigationUtils.checkAndRedirectIfNeeded();
    }, 500);
});

// ===================================================================
// EXPORT PARA COMPATIBILIDAD
// ===================================================================

// Para usar en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationUtils;
} 