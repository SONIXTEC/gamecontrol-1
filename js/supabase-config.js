/**
 * Configuración de Supabase - GameControl
 * Conexión con la base de datos PostgreSQL
 */

console.log('📦 Cargando supabase-config.js...');

// ===================================================================
// CONFIGURACIÓN DE SUPABASE
// ===================================================================

const SUPABASE_CONFIG = {
    url: 'https://stjbtxrrdofuxhigxfcy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0amJ0eHJyZG9mdXhoaWd4ZmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MTgwNzUsImV4cCI6MjA3NzM5NDA3NX0.vhz6v2pRepUH7g-ucSJKtWonmAeWYqwhrTxG_ypVElo',
    options: {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        },
        global: {
            headers: {
                'X-Client-Info': 'GameControl-v1.0'
            }
        }
    }
};

// ===================================================================
// CLIENTE SUPABASE
// ===================================================================

let supabaseClient = null;
let initializationPromise = null;
let fallbackAttempted = false; // Evitar múltiples cargas del script
let connectionCheckScheduled = false; // Evitar múltiples verificaciones concurrentes
let connectionBackoffMs = 3000; // Backoff inicial
const connectionBackoffMax = 30000; // Límite de backoff

// Intenta cargar el script de Supabase desde un CDN confiable (UMD) o ESM como fallback
async function loadSupabaseScriptFallback() {
    if (fallbackAttempted) return Promise.resolve(true);
    fallbackAttempted = true;
    return new Promise((resolve, reject) => {
        try {
            // Evitar cargar dos veces si ya está disponible de forma válida
            const hasValidGlobal = (
                (window.supabase && typeof window.supabase.createClient === 'function') ||
                (typeof createClient === 'function')
            );
            if (hasValidGlobal) return resolve(true);

            // Preferir UMD explícito (garantiza window.supabase)
            const umdUrl = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js';
            const alreadyLoaded = Array.from(document.scripts).some(s => (s.src || '').includes('dist/umd/supabase'));
            if (!alreadyLoaded) {
                const s = document.createElement('script');
                s.src = umdUrl;
                s.async = true;
                s.onload = () => resolve(true);
                s.onerror = () => {
                    // Como último recurso, intentar ESM dinámico
                    try {
                        import('https://esm.sh/@supabase/supabase-js@2?bundle').then(mod => {
                            // Exponer createClient si no existe global
                            if (mod && typeof mod.createClient === 'function' && typeof window.createClient !== 'function') {
                                window.createClient = mod.createClient;
                            }
                            resolve(true);
                        }).catch(err => reject(err));
                    } catch (err) {
                        reject(err);
                    }
                };
                document.head.appendChild(s);
            } else {
                resolve(true);
            }
        } catch (e) {
            reject(e);
        }
    });
}

// Función para esperar a que Supabase esté disponible
function waitForSupabase(maxAttempts = 60) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkSupabase = () => {
            attempts++;
            
            // Verificar diferentes formas de acceder a createClient
            let createClientFunction = null;

            if (typeof createClient === 'function') {
                createClientFunction = createClient;
            } else if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
                createClientFunction = supabase.createClient;
            } else if (window.supabase && typeof window.supabase.createClient === 'function') {
                createClientFunction = window.supabase.createClient;
            }

            if (typeof createClientFunction === 'function') {
                console.log('✅ Supabase detectado después de', attempts, 'intentos');
                resolve(createClientFunction);
            } else if (attempts === Math.floor(maxAttempts / 2)) {
                // A mitad de los intentos, intentar cargar fallback de CDN
                console.warn('⚠️ No se detecta Supabase aún, intentando cargar CDN alternativo...');
                loadSupabaseScriptFallback().catch(() => {/* noop */});
                setTimeout(checkSupabase, 250);
            } else if (attempts >= maxAttempts) {
                console.error('❌ Supabase no disponible después de', maxAttempts, 'intentos');
                reject(new Error('Supabase no está disponible'));
            } else {
                setTimeout(checkSupabase, 250);
            }
        };
        
        checkSupabase();
    });
}

// Función para inicializar Supabase
async function initializeSupabase() {
    try {
        console.log('🔄 Inicializando Supabase...');
        
        // Esperar a que Supabase esté disponible
        let createClientFunction = null;
        try {
            createClientFunction = await waitForSupabase();
        } catch (_) {}

        // Fallback defensivo si la espera devolvió algo inesperado
        if (typeof createClientFunction !== 'function') {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                createClientFunction = window.supabase.createClient;
            } else if (typeof window.createClient === 'function') {
                createClientFunction = window.createClient;
            } else if (typeof createClient === 'function') {
                createClientFunction = createClient;
            }
        }

        if (typeof createClientFunction !== 'function') {
            throw new Error('createClientFunction no es una función después de la detección');
        }

        // Crear cliente de Supabase
        supabaseClient = createClientFunction(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            SUPABASE_CONFIG.options
        );
        
        console.log('✅ Supabase inicializado correctamente');
        console.log('🔗 URL:', SUPABASE_CONFIG.url);
        
        return supabaseClient;
    } catch (error) {
        console.error('❌ Error inicializando Supabase:', error);
        // Evitar overlays innecesarios si estamos en login con banderas para no saturar
        if (!window.SUPABASE_SKIP_CONNECTION_POLL && !window.SUPABASE_SKIP_AUTO_INIT) {
            try { mostrarOverlayError(); } catch (_) {}
        }
        return null;
    }
}

// Función para obtener el cliente (con inicialización asíncrona)
async function getSupabaseClient() {
    if (!supabaseClient) {
        if (!initializationPromise) {
            initializationPromise = initializeSupabase();
        }
        const result = await initializationPromise;
        if (!result) {
            // Inicialización fallida: limpiar promesa para permitir reintentos posteriores
            initializationPromise = null;
            return null;
        }
        supabaseClient = result;
    }
    return supabaseClient;
}

// Función síncrona para obtener el cliente (para compatibilidad)
function getSupabaseClientSync() {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase no inicializado. Usando inicialización síncrona...');
        return initializeSupabase();
    }
    return supabaseClient;
}

// Crear un cliente temporal sin persistir sesión (para operaciones puntuales)
async function createTempClient(optionsOverride = {}) {
    const createClientFunction = await waitForSupabase();
    const options = Object.assign({}, SUPABASE_CONFIG.options, optionsOverride);
    return createClientFunction(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey,
        options
    );
}

// ===================================================================
// UTILIDADES DE CONEXIÓN
// ===================================================================

// Verificar conexión con la base de datos
async function verificarConexion() {
    try {
        const client = await getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase no disponible');
        }

        // Prueba de PostgREST: consulta mínima
        const { data, error } = await client
            .from('configuracion')
            .select('id')
            .limit(1);

        if (error) {
            // Si hay error por tabla inexistente o RLS, consideramos que hay conectividad
            // y marcamos warning para no bloquear la UI en producción
            const mensaje = error.message || String(error);
            console.warn('⚠️ Advertencia al verificar conexión:', mensaje);
            return { success: true, warning: mensaje };
        }

        console.log('✅ Conexión con Supabase verificada');
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error verificando conexión:', error);
        return { success: false, error: error.message };
    }
}

// Función para manejar errores de Supabase
function handleSupabaseError(error, operacion = 'operación') {
    console.error(`❌ Error en ${operacion}:`, error);
    
    let mensaje = 'Error en la base de datos';
    
    if (error.code === 'PGRST116') {
        mensaje = 'No se encontraron registros';
    } else if (error.code === '23505') {
        mensaje = 'Ya existe un registro con esos datos';
    } else if (error.code === '23503') {
        mensaje = 'No se puede eliminar, hay registros relacionados';
    } else if (error.message) {
        mensaje = error.message;
    }
    
    return {
        success: false,
        error: mensaje,
        code: error.code
    };
}

// Función para manejar éxitos de Supabase
function handleSupabaseSuccess(data, mensaje = 'Operación exitosa') {
    console.log('✅', mensaje, data);
    return {
        success: true,
        data: data,
        mensaje: mensaje
    };
}

// ===================================================================
// CONFIGURACIÓN DEL SISTEMA
// ===================================================================

// Configurar modo de operación - SOLO REMOTE PERMITIDO
function configurarModo(modo) {
    if (modo !== 'remote') {
        console.warn('⚠️ Solo se permite modo "remote". Configurando automáticamente a remote.');
        modo = 'remote';
    }
    
    const modoOperacion = 'remote';
    console.log('🔧 Sistema configurado en modo REMOTE (solo Supabase)');
    
    // No guardar en localStorage - solo memoria
    return modoOperacion;
}

// Obtener modo de operación
function obtenerModo() {
    return 'remote'; // Siempre remote
}

// ===================================================================
// VERIFICACIÓN DE ESTADO DE CONEXIÓN
// ===================================================================

let connectionCheckInterval = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

async function verificarEstadoConexion() {
    if (window.SUPABASE_SKIP_CONNECTION_POLL) {
        console.log('⏸️ Poll de conexión deshabilitado por configuración global');
        return true;
    }
    if (connectionCheckScheduled) {
        return false; // ya hay una verificación en curso o programada
    }
    connectionCheckScheduled = true;
    try {
        console.log('🔍 Verificando estado de conexión...');
        
        // Asegurar cliente antes de verificar
        let client = await getSupabaseClient();
        if (!client) {
            console.warn('⚠️ Cliente no disponible; reintentando inicialización...');
            client = await getSupabaseClient();
        }

        const resultado = await verificarConexion();
        
        if (resultado.success) {
            console.log('✅ Conexión establecida');
            connectionAttempts = 0;
            
            // Limpiar intervalo si existe
            if (connectionCheckInterval) {
                clearInterval(connectionCheckInterval);
                connectionCheckInterval = null;
            }
            connectionBackoffMs = 3000; // reset backoff al éxito
            connectionCheckScheduled = false;
            
            return true;
        } else {
            connectionAttempts++;
            console.error(`❌ Error de conexión (Intento ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
            
            if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
                console.error('❌ Error de conexión (Intento 5/5)');
                // Detener los reintentos automáticos hasta interacción del usuario
                connectionCheckScheduled = false;
                return false;
            }
            
            // Reintentar con backoff exponencial controlado
            const nextDelay = Math.min(connectionBackoffMs, connectionBackoffMax);
            console.log(`🔄 Reintentando conexión en ${Math.floor(nextDelay/1000)}s...`);
            setTimeout(async () => {
                connectionCheckScheduled = false;
                connectionBackoffMs = Math.min(connectionBackoffMs * 2, connectionBackoffMax);
                await verificarEstadoConexion();
            }, nextDelay);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando estado de conexión:', error);
        connectionCheckScheduled = false;
        return false;
    }
}

// Mostrar error de conexión
function mostrarErrorConexion() {
    console.error('🚨 ERROR CRÍTICO: No se puede conectar a Supabase');
    
    // Crear overlay de error si no existe
    if (!document.getElementById('errorOverlay')) {
        mostrarOverlayError();
    }
}

// Mostrar overlay de error
function mostrarOverlayError() {
    const overlay = document.createElement('div');
    overlay.id = 'errorOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(220, 53, 69, 0.95);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: Arial, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem;">🚨 Error de Conexión</h1>
            <p style="font-size: 1.2rem; margin-bottom: 1rem;">No se puede conectar a la base de datos</p>
            <p style="font-size: 1rem; margin-bottom: 2rem;">Verifica tu conexión a internet y recarga la página</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #dc3545;
                border: none;
                padding: 1rem 2rem;
                border-radius: 8px;
                font-size: 1.1rem;
                cursor: pointer;
            ">🔄 Recargar Página</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

// ===================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ===================================================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    if (window.SUPABASE_SKIP_AUTO_INIT) {
        console.log('⏸️ Auto-inicialización de Supabase deshabilitada por configuración global');
        return;
    }
    console.log('🚀 Inicializando configuración de Supabase...');
    try {
        // Inicializar Supabase (una sola vez gracias a initializationPromise)
        await getSupabaseClient();
        // Verificar conexión pero no bloquear si falla
        try {
            await verificarEstadoConexion();
            console.log('✅ Configuración de Supabase completada');
        } catch (connError) {
            console.warn('⚠️ Conexión a Supabase no disponible, continuando offline');
        }
    } catch (error) {
        console.warn('⚠️ Error en inicialización de Supabase:', error.message);
        // No mostrar overlay de error, permitir que la app continúe
    }
});

// ===================================================================
// CONFIGURACIÓN DE TABLAS
// ===================================================================

const TABLAS = {
    USUARIOS: 'usuarios',
    SALAS: 'salas',
    SESIONES: 'sesiones',
    PRODUCTOS: 'productos',
    MOVIMIENTOS_STOCK: 'movimientos_stock',
    GASTOS: 'gastos',
    CONFIGURACION: 'configuracion',
    NOTIFICACIONES: 'notificaciones'
};

// ===================================================================
// MODO DE OPERACIÓN - SOLO REMOTE (SUPABASE)
// ===================================================================

let modoOperacion = 'remote'; // SOLO MODO REMOTE - NO localStorage

// ===================================================================
// EXPORTAR CONFIGURACIÓN
// ===================================================================

// Para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        TABLAS,
        initializeSupabase,
        getSupabaseClient,
        getSupabaseClientSync,
        createTempClient,
        verificarConexion,
        handleSupabaseError,
        handleSupabaseSuccess,
        configurarModo,
        obtenerModo
    };
}

// Hacer disponible globalmente
window.supabaseConfig = {
    SUPABASE_CONFIG,
    TABLAS,
    initializeSupabase,
    getSupabaseClient,
    getSupabaseClientSync,
    createTempClient,
    verificarConexion,
    verificarEstadoConexion,
    handleSupabaseError,
    handleSupabaseSuccess,
    configurarModo,
    obtenerModo
}; 