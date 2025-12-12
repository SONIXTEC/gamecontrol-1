// === GESTIÓN DE AUTENTICACIÓN CON SUPABASE EXCLUSIVAMENTE ===

// ===================================================================
// CONFIGURACIÓN DE LOGIN
// ===================================================================

let authSystem = null;
// === GESTIÓN DE AUTENTICACIÓN CON SUPABASE EXCLUSIVAMENTE ===

// ===================================================================
// CONFIGURACIÓN DE LOGIN
// ===================================================================

let authSystem = null;
let loginInProgress = false;

// ===================================================================
// INICIALIZACIÓN DEL SISTEMA DE LOGIN
// ===================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔐 Inicializando sistema de login...');

    try {
        // Esperar a que Supabase esté disponible
        await waitForSupabase();

        // Verificar sesión existente
        await verificarSesionExistente();

        // Configurar formulario y eventos
        configurarFormularioLogin();
        configurarEventos();

        // Mostrar información del sistema
        mostrarInformacionSistema();

        console.log('✅ Sistema de login inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando login:', error);
        mostrarErrorConexion();
    }
});

// ===================================================================
// ESPERAR SUPABASE
// ===================================================================

async function waitForSupabase() {
    // Usar la función asíncrona de supabase-config.js si existe
    if (window.supabaseConfig && typeof window.supabaseConfig.getSupabaseClient === 'function') {
        await window.supabaseConfig.getSupabaseClient();
        return;
    }

    // Fallback: esperar hasta 4 segundos
    let attempts = 0;
    const maxAttempts = 20;
    while (attempts < maxAttempts) {
        if (window.supabaseConfig && typeof window.supabaseConfig.getSupabaseClient === 'function') {
            await window.supabaseConfig.getSupabaseClient();
            return;
        }
        await new Promise((r) => setTimeout(r, 200));
        attempts++;
    }
    throw new Error('Supabase no está disponible después de 4 segundos');
}

// ===================================================================
// VERIFICAR SESIÓN EXISTENTE
// ===================================================================

async function verificarSesionExistente() {
    try {
        const client = await window.supabaseConfig.getSupabaseClient();
        const { data: { session }, error } = await client.auth.getSession();

        if (error) {
            console.error('Error verificando sesión:', error);
            return;
        }

        if (session) {
            console.log('✅ Sesión activa encontrada, redirigiendo...');
            mostrarAlerta('info', 'Ya tienes una sesión activa. Redirigiendo...');
            setTimeout(() => {
                if (window.navigationUtils && typeof window.navigationUtils.loginSuccess === 'function') {
                    window.navigationUtils.loginSuccess();
                } else {
                    window.location.href = 'index.html';
                }
            }, 800);
        }
    } catch (error) {
        console.error('Error verificando sesión existente:', error);
    }
}

// ===================================================================
// CONFIGURACIÓN DEL FORMULARIO Y EVENTOS
// ===================================================================

function configurarFormularioLogin() {
    // Pre-llenar credenciales para desarrollo (solo en localhost)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        const emailField = document.getElementById('email');
        const passwordField = document.getElementById('password');
        if (emailField && passwordField) {
            emailField.value = 'maurochica23@gmail.com';
            passwordField.value = 'kennia23';
            mostrarAlerta('info', 'Modo desarrollo: Credenciales pre-llenadas');
        }
    }
}

function configurarEventos() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', manejarLogin);

    const togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const passwordField = document.getElementById('password');
            const icon = togglePassword.querySelector('i');
            if (!passwordField || !icon) return;
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordField.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }

    ;['email', 'password'].forEach((id) => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') manejarLogin(e);
            });
        }
    });
}

// ===================================================================
// MANEJO DEL LOGIN
// ===================================================================

async function manejarLogin(e) {
    e.preventDefault();
    if (loginInProgress) return;
    loginInProgress = true;

    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const loginButton = document.querySelector('#loginForm button[type="submit"]');

    const email = (emailField?.value || '').trim();
    const password = passwordField?.value || '';

    if (!email || !password) {
        mostrarAlerta('error', 'Por favor, completa todos los campos');
        loginInProgress = false;
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarAlerta('error', 'Por favor, ingresa un email válido');
        loginInProgress = false;
        return;
    }

    try {
        mostrarEstadoCarga(true, loginButton);

        const resultado = await autenticarConSupabase(email, password);

        if (resultado.success) {
            mostrarAlerta('success', `¡Bienvenido ${resultado.usuario.nombre}!`);
            setTimeout(() => {
                if (window.navigationUtils && typeof window.navigationUtils.loginSuccess === 'function') {
                    window.navigationUtils.loginSuccess();
                } else {
                    window.location.href = 'index.html';
                }
            }, 800);
        } else {
            mostrarAlerta('error', resultado.error || 'Error de autenticación');
        }
    } catch (error) {
        console.error('Error en login:', error);
        mostrarAlerta('error', 'Error de conexión. Verifica tu internet.');
    } finally {
        mostrarEstadoCarga(false, loginButton);
        loginInProgress = false;
    }
}

// ===================================================================
// AUTENTICACIÓN CON SUPABASE
// ===================================================================

async function autenticarConSupabase(email, password) {
    try {
        const client = await window.supabaseConfig.getSupabaseClient();

        console.log('🔐 Intentando autenticación para:', email);

        // 1) Verificar primero en la tabla usuarios
        let usuario = null;
        try {
            const { data: usuariosData, error: usuariosError } = await client
                .from('usuarios')
                .select('*')
                .eq('email', email)
                .eq('estado', 'activo')
                .single();

            if (!usuariosError && usuariosData) {
                console.log('✅ Usuario encontrado en tabla usuarios');
                
                // Verificar contraseña usando la función RPC
                try {
                    const { data: passwordValid, error: passError } = await client
                        .rpc('verificar_password', {
                            password: password,
                            hash: usuariosData.password_hash
                        });

                    if (!passError && passwordValid) {
                        console.log('✅ Contraseña verificada correctamente');
                        usuario = usuariosData;
                    } else {
                        console.log('❌ Contraseña incorrecta');
                        return { success: false, error: 'Contraseña incorrecta' };
                    }
                } catch (passErr) {
                    console.warn('⚠️ Función verificar_password no disponible, intentando auth directo');
                    // Fallback: intentar con Supabase Auth directamente
                }
            }
        } catch (err) {
            console.warn('⚠️ Error verificando en tabla usuarios:', err);
        }

        // 2) Si no se encontró en tabla o no se pudo verificar, intentar RPC auth_login_v2
        if (!usuario) {
            try {
                const { data: authUserRows, error: rpcError } = await client.rpc('auth_login_v2', { 
                    p_email: email, 
                    p_password: password 
                });
                
                if (!rpcError && authUserRows) {
                    usuario = Array.isArray(authUserRows) ? authUserRows[0] : authUserRows;
                    if (usuario) {
                        console.log('✅ Usuario autenticado via RPC auth_login_v2');
                    }
                }
            } catch (rpcErr) {
                console.warn('⚠️ RPC auth_login_v2 no disponible:', rpcErr.message);
            }
        }

        // 3) Si aún no hay usuario, verificar en Supabase Auth + tabla usuarios
        if (!usuario) {
            try {
                const { data: authData, error: authError } = await client.auth.signInWithPassword({ 
                    email, 
                    password 
                });

                if (!authError && authData?.user) {
                    console.log('✅ Usuario autenticado en Supabase Auth');
                    
                    // Buscar datos completos en tabla usuarios
                    const { data: userData } = await client
                        .from('usuarios')
                        .select('*')
                        .eq('email', email)
                        .single();

                    if (userData) {
                        usuario = userData;
                    } else {
                        // Crear usuario en tabla si solo existe en Auth
                        const adminEmails = ['maurochica23@gmail.com', 'admin@gamecontrol.com', 'admin@sonixtec.co'];
                        const esAdmin = adminEmails.includes(String(email).toLowerCase());
                        const rolAsignado = esAdmin ? 'administrador' : 'operador';
                        const permisosPorRol = (rol) => {
                            if (rol === 'administrador') return { dashboard: true, salas: true, ventas: true, gastos: true, stock: true, reportes: true, usuarios: true, ajustes: true };
                            if (rol === 'supervisor') return { dashboard: true, salas: true, ventas: true, gastos: true, stock: true, reportes: true, usuarios: false, ajustes: false };
                            if (rol === 'operador') return { dashboard: true, salas: true, ventas: true, gastos: false, stock: true, reportes: false, usuarios: false, ajustes: false };
                            return { dashboard: true, salas: true, ventas: true, gastos: false, stock: true, reportes: false, usuarios: false, ajustes: false };
                        };

                        console.log(`📝 Creando usuario en tabla desde Auth con rol ${rolAsignado}`);
                        const { data: nuevoUsuario } = await client
                            .from('usuarios')
                            .insert({
                                email: email,
                                nombre: email.split('@')[0],
                                rol: rolAsignado,
                                estado: 'activo',
                                password_hash: 'managed_by_auth',
                                permisos: permisosPorRol(rolAsignado)
                            })
                            .select()
                            .single();
                        
                        usuario = nuevoUsuario || { email, nombre: email.split('@')[0], rol: rolAsignado, permisos: permisosPorRol(rolAsignado) };
                    }
                } else {
                    console.log('❌ Autenticación fallida:', authError?.message);
                }
            } catch (authErr) {
                console.warn('⚠️ Error en Supabase Auth:', authErr);
            }
        }

        if (!usuario) {
            return { success: false, error: 'Usuario no encontrado o credenciales inválidas' };
        }

        // 4) Actualizar último acceso
        try {
            await client
                .from('usuarios')
                .update({ ultimo_acceso: new Date().toISOString() })
                .eq('email', email);
        } catch (updateErr) {
            console.warn('⚠️ No se pudo actualizar último acceso');
        }

        // 5) Asegurar permisos por defecto si no están definidos
        if (!usuario.permisos || Object.keys(usuario.permisos).length === 0) {
            console.log('⚠️ Usuario sin permisos definidos, asignando permisos por defecto');
            usuario.permisos = {
                dashboard: true,
                salas: true,
                ventas: true,
                gastos: usuario.rol !== 'vendedor',
                stock: true,
                reportes: usuario.rol !== 'vendedor',
                usuarios: usuario.rol === 'administrador' || usuario.rol === 'supervisor',
                ajustes: usuario.rol === 'administrador' || usuario.rol === 'supervisor'
            };
        }
        
        const sesionLocal = {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.correo || usuario.email,
            rol: usuario.rol,
            permisos: usuario.permisos,
            fechaLogin: new Date().toISOString(),
        };
        
        console.log('✅ Sesión creada para:', sesionLocal.nombre, 'Rol:', sesionLocal.rol, 'Permisos:', sesionLocal.permisos);
        
        try {
            localStorage.setItem('sesionActual', JSON.stringify(sesionLocal));
            localStorage.setItem('salas_current_session', JSON.stringify({
                userId: usuario.id,
                loginTime: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
            }));
        } catch (_) {}

        return { success: true, usuario };
    } catch (error) {
        console.error('Error en autenticación:', error);
        return { success: false, error: 'Error de conexión' };
    }
}

// ===================================================================
// UTILIDADES DE UI
// ===================================================================

function mostrarEstadoCarga(mostrar, button) {
    if (!button) return;
    if (mostrar) {
        button.disabled = true;
        button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            Iniciando sesión...
        `;
    } else {
        button.disabled = false;
        button.innerHTML = `
            <i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión
        `;
    }
}

function mostrarAlerta(tipo, mensaje) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertId = 'alert-' + Date.now();
    const tipoClases = { success: 'alert-success', error: 'alert-danger', warning: 'alert-warning', info: 'alert-info' };
    const iconos = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-triangle', warning: 'fas fa-exclamation-circle', info: 'fas fa-info-circle' };

    const alerta = document.createElement('div');
    alerta.id = alertId;
    alerta.className = `alert ${tipoClases[tipo]} alert-dismissible fade show`;
    alerta.innerHTML = `
        <i class="${iconos[tipo]} me-2"></i>
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alerta);
    setTimeout(() => document.getElementById(alertId)?.remove(), 5000);
}

function mostrarInformacionSistema() {
    const infoContainer = document.getElementById('systemInfo');
    if (!infoContainer) return;
    infoContainer.innerHTML = `
        <div class="text-center">
            <h5><i class="fas fa-cloud me-2"></i>Sistema Online</h5>
            <p class="mb-2"><i class="fas fa-database me-1"></i>Base de datos: <span class="text-success">Supabase PostgreSQL</span></p>
            <p class="mb-2"><i class="fas fa-shield-alt me-1"></i>Autenticación: <span class="text-success">Supabase Auth</span></p>
            <small class="text-muted"><i class="fas fa-wifi me-1"></i>Requiere conexión a internet</small>
        </div>
    `;
}

function mostrarErrorConexion() {
    const container = document.querySelector('.login-container') || document.body;
    container.innerHTML = `
        <div class="alert alert-danger text-center">
            <h4><i class="fas fa-exclamation-triangle me-2"></i>Error de Conexión</h4>
            <p>No se puede conectar con el servidor.</p>
            <p class="mb-3">Verifica tu conexión a internet y refresca la página.</p>
            <button class="btn btn-outline-danger" onclick="window.location.reload()">
                <i class="fas fa-sync-alt me-2"></i>Reintentar
            </button>
        </div>
    `;
}

// ===================================================================
// FUNCIONES DE COMPATIBILIDAD
// ===================================================================

// Función para mostrar ayuda (si existe en el HTML)
function mostrarAyuda() {
    alert(`
💡 AYUDA DEL SISTEMA

🔐 Credenciales de Administrador:
• Email: maurochica23@gmail.com
• Contraseña: kennia23

🌐 Características:
• Sistema completamente online
• Base de datos en la nube (Supabase)
• Sincronización en tiempo real
• Acceso desde cualquier dispositivo

⚠️ Importante:
• Requiere conexión a internet
• Las sesiones se mantienen seguras
• Cierra sesión al finalizar

¿Problemas de acceso?
Verifica tu conexión a internet y refresca la página.
    `);
}

// Funciones de limpieza (para compatibilidad con versiones anteriores)
function reiniciarDatos() {
    if (confirm('⚠️ Esta función no está disponible en modo online.\n\nLos datos se gestionan directamente en la base de datos.')) {
        window.location.href = 'configurar_supabase.html';
    }
}

function depurarEstado() {
    console.log('🔍 Estado del sistema:');
    console.log('- Modo: Solo Supabase (Online)');
    console.log('- Cliente Supabase:', !!window.supabaseConfig?.getSupabaseClient);
    console.log('- Database Service:', !!window.databaseService);
    console.log('- Session Manager:', !!window.sessionManager);
    
    mostrarAlerta('info', 'Estado del sistema mostrado en consola (F12)');
}