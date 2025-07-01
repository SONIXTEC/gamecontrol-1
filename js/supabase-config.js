/**
 * Configuración de Supabase - GameControl
 * Conexión con la base de datos PostgreSQL
 */

// ===================================================================
// CONFIGURACIÓN DE SUPABASE
// ===================================================================

const SUPABASE_CONFIG = {
    url: 'https://tateokatiqzcdobgjdwk.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdGVva2F0aXF6Y2RvYmdqZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc4MDQsImV4cCI6MjA2Njk2MzgwNH0.ADajccIXfww1OeHK4nZ6IM9dChWe18aQHo-QPjnMV6Y',
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

// Función para inicializar Supabase
function initializeSupabase() {
    try {
        // Verificar que la librería de Supabase esté cargada
        if (typeof createClient === 'undefined') {
            console.error('❌ Supabase client no está disponible. Asegúrate de cargar la librería.');
            return null;
        }

        // Crear cliente de Supabase
        supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, SUPABASE_CONFIG.options);
        
        console.log('✅ Supabase inicializado correctamente');
        console.log('🔗 URL:', SUPABASE_CONFIG.url);
        
        return supabaseClient;
    } catch (error) {
        console.error('❌ Error inicializando Supabase:', error);
        return null;
    }
}

// Función para obtener el cliente
function getSupabaseClient() {
    if (!supabaseClient) {
        console.log('🔄 Inicializando Supabase...');
        return initializeSupabase();
    }
    return supabaseClient;
}

// ===================================================================
// UTILIDADES DE CONEXIÓN
// ===================================================================

// Verificar conexión con la base de datos
async function verificarConexion() {
    try {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase no disponible');
        }

        // Hacer una consulta simple para verificar la conexión
        const { data, error } = await client
            .from('configuracion')
            .select('clave')
            .limit(1);

        if (error) {
            console.error('❌ Error de conexión con Supabase:', error);
            return { success: false, error: error.message };
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

// Función para formatear respuesta exitosa
function handleSupabaseSuccess(data, mensaje = 'Operación exitosa') {
    return {
        success: true,
        data: data,
        message: mensaje
    };
}

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
// MODO DE OPERACIÓN
// ===================================================================

let modoOperacion = 'hybrid'; // 'local', 'remote', 'hybrid'

// Configurar modo de operación
function configurarModo(modo) {
    if (['local', 'remote', 'hybrid'].includes(modo)) {
        modoOperacion = modo;
        console.log(`🔧 Modo de operación cambiado a: ${modo}`);
        
        // Guardar preferencia
        localStorage.setItem('gamecontrol_modo', modo);
    } else {
        console.error('❌ Modo no válido. Usa: local, remote, hybrid');
    }
}

// Obtener modo de operación
function obtenerModo() {
    const modoGuardado = localStorage.getItem('gamecontrol_modo');
    if (modoGuardado && ['local', 'remote', 'hybrid'].includes(modoGuardado)) {
        modoOperacion = modoGuardado;
    }
    return modoOperacion;
}

// ===================================================================
// ESTADO DE CONEXIÓN
// ===================================================================

let estadoConexion = {
    conectado: false,
    ultimaVerificacion: null,
    intentosReconexion: 0,
    maxIntentos: 3
};

// Verificar estado de la conexión
async function verificarEstadoConexion() {
    const resultado = await verificarConexion();
    
    estadoConexion.conectado = resultado.success;
    estadoConexion.ultimaVerificacion = new Date();
    
    if (!resultado.success) {
        estadoConexion.intentosReconexion++;
        
        if (estadoConexion.intentosReconexion < estadoConexion.maxIntentos) {
            console.log(`🔄 Intento de reconexión ${estadoConexion.intentosReconexion}/${estadoConexion.maxIntentos}`);
            setTimeout(verificarEstadoConexion, 5000);
        } else {
            console.log('⚠️ Máximo de intentos de reconexión alcanzado. Cambiando a modo local.');
            configurarModo('local');
        }
    } else {
        estadoConexion.intentosReconexion = 0;
        if (modoOperacion === 'local') {
            console.log('✅ Conexión restaurada. Cambiando a modo híbrido.');
            configurarModo('hybrid');
        }
    }
    
    return estadoConexion;
}

// ===================================================================
// FUNCIONES GLOBALES
// ===================================================================

// Hacer disponibles las funciones principales
window.supabaseConfig = {
    initialize: initializeSupabase,
    getClient: getSupabaseClient,
    verificarConexion,
    configurarModo,
    obtenerModo,
    verificarEstadoConexion,
    handleError: handleSupabaseError,
    handleSuccess: handleSupabaseSuccess,
    TABLAS,
    CONFIG: SUPABASE_CONFIG
};

// ===================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ===================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando conexión con Supabase...');
    
    // Obtener modo guardado
    obtenerModo();
    console.log(`📋 Modo de operación: ${modoOperacion}`);
    
    // Inicializar cliente
    const client = initializeSupabase();
    
    if (client && (modoOperacion === 'remote' || modoOperacion === 'hybrid')) {
        // Verificar conexión inicial
        setTimeout(async () => {
            const estado = await verificarEstadoConexion();
            console.log('📊 Estado de conexión inicial:', estado);
        }, 1000);
        
        // Verificación periódica cada 5 minutos
        setInterval(verificarEstadoConexion, 300000);
    }
});

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
        verificarConexion,
        handleSupabaseError,
        handleSupabaseSuccess
    };
} 