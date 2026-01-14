// === UTILIDADES ===
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Notificaciones ligeras (toasts simples)
function mostrarToast(mensaje, tipo = 'info') {
    const map = {
        success: 'alert-success',
        error: 'alert-danger',
        warning: 'alert-warning',
        info: 'alert-info'
    };
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.position = 'fixed';
        container.style.right = '16px';
        container.style.bottom = '16px';
        container.style.zIndex = '1080';
        container.style.maxWidth = '340px';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `alert ${map[tipo] || 'alert-info'} shadow-sm border-0`;
    el.style.marginTop = '8px';
    el.style.opacity = '0.95';
    el.innerHTML = `
        <div class="d-flex align-items-start">
            <div class="flex-grow-1">${mensaje}</div>
            <button type="button" class="btn-close" aria-label="Close"></button>
        </div>
    `;
    el.querySelector('.btn-close').onclick = () => el.remove();
    container.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch(_) {} }, 4500);
}

function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generarIniciales(nombre) {
    return nombre.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// === GESTIÓN DE DATOS ===
function obtenerUsuarios() {
    return JSON.parse(localStorage.getItem('usuarios') || '[]');
}

function guardarUsuarios(usuarios) {
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    
    // Notificar al AuthSystem que los usuarios han cambiado
    if (window.recargarUsuarios) {
        setTimeout(() => {
            window.recargarUsuarios();
        }, 100);
    }
}

function obtenerPermisosPorDefecto() {
    return {
        dashboard: true,
        salas: false,
        ventas: false,
        gastos: false,
        stock: false,
        reportes: false,
        usuarios: false,
        ajustes: false
    };
}

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
    
    return permisos[rol.toLowerCase()] || obtenerPermisosPorDefecto();
}

// === CLASE PRINCIPAL ===
class GestorUsuarios {
    constructor() {
        this.usuarios = [];
        this.usuarioEditando = null;
        this.inicializar();
    }

    async inicializar() {
        await this.cargarUsuarios();
        this.configurarEventos();
        this.actualizarEstadisticas();
        this.cargarUsuariosEnTabla();
    }

    async cargarUsuarios() {
        console.log('🔄 Cargando usuarios...');
        
        // Intentar cargar desde Supabase primero (sincroniza Auth -> BD)
        await this.sincronizarConAuth();
        
        // Si no hay usuarios en Supabase, cargar desde localStorage
        if (this.usuarios.length === 0) {
            console.log('⚠️ No hay usuarios en BD, cargando desde localStorage');
            this.usuarios = obtenerUsuarios();
        }
        
        console.log('✅ Sistema de usuarios iniciado:', this.usuarios.length, 'usuarios');
        console.log('📋 Usuarios:', this.usuarios.map(u => `${u.email} (${u.rol})`).join(', '));
    }

    configurarEventos() {
        // Formulario de crear usuario
        const formCrearUsuario = document.getElementById('formCrearUsuario');
        if (formCrearUsuario) {
            formCrearUsuario.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.crearUsuario(new FormData(formCrearUsuario));
            });
        }

        // Formulario de editar usuario
        const formEditarUsuario = document.getElementById('formEditarUsuario');
        if (formEditarUsuario) {
            formEditarUsuario.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarEdicionUsuario();
            });
        }

        // Cambio de rol para actualizar permisos por defecto
        const selectRol = document.querySelector('select[name="rol"]');
        if (selectRol) {
            selectRol.addEventListener('change', (e) => {
                this.actualizarPermisosPorRol(e.target.value);
            });
        }

        // Cambio de rol en modal de edición
        const selectRolEditar = document.getElementById('editarRol');
        if (selectRolEditar) {
            selectRolEditar.addEventListener('change', (e) => {
                this.actualizarPermisosEdicionPorRol(e.target.value);
            });
        }

        // Formulario de cambiar contraseña
        const formCambiarPassword = document.getElementById('formCambiarPassword');
        if (formCambiarPassword) {
            formCambiarPassword.addEventListener('submit', (e) => {
                e.preventDefault();
                this.cambiarPasswordUsuario();
            });
        }

        // Toggles para mostrar/ocultar contraseñas
        const togglePassword1 = document.getElementById('togglePassword1');
        const togglePassword2 = document.getElementById('togglePassword2');
        
        if (togglePassword1) {
            togglePassword1.addEventListener('click', () => {
                this.togglePasswordVisibility('nuevaPassword', 'togglePassword1');
            });
        }
        
        if (togglePassword2) {
            togglePassword2.addEventListener('click', () => {
                this.togglePasswordVisibility('confirmarPassword', 'togglePassword2');
            });
        }

        // Filtros
        const filtroRol = document.getElementById('filtroRol');
        const filtroEstado = document.getElementById('filtroEstado');
        const buscarUsuario = document.getElementById('buscarUsuario');

        if (filtroRol) filtroRol.addEventListener('change', () => this.aplicarFiltros());
        if (filtroEstado) filtroEstado.addEventListener('change', () => this.aplicarFiltros());
        if (buscarUsuario) buscarUsuario.addEventListener('input', () => this.aplicarFiltros());
    }

    async crearUsuario(formData) {
        const nombre = formData.get('nombre')?.trim();
        const email = formData.get('email')?.trim();
        const rol = formData.get('rol');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validaciones
        if (!nombre || !email || !rol || !password) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }

        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        // Verificar que el email no existe
        if (this.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            alert('Ya existe un usuario con ese correo electrónico');
            return;
        }

        // Obtener permisos personalizados del formulario
        const permisos = {};
        const checkboxesPermisos = document.querySelectorAll('input[name="permisos[]"]:checked');
        
        // Inicializar todos los permisos como false
        Object.keys(obtenerPermisosPorDefecto()).forEach(permiso => {
            permisos[permiso] = false;
        });
        
        // Activar los permisos seleccionados
        checkboxesPermisos.forEach(checkbox => {
            permisos[checkbox.value] = true;
        });

        // Guardar en Supabase primero (vía RPC crear_usuario)
        try {
            if (!window.databaseService) {
                alert('Servicio de base de datos no disponible. Verifica la conexión.');
                return;
            }

            const client = await window.databaseService.getClient();
            const { data: rpcData, error: rpcError } = await client.rpc('crear_usuario', {
                p_nombre: nombre,
                p_email: email,
                p_password: password,
                p_rol: rol,
                p_permisos: permisos
            });

            if (rpcError) {
                console.error('❌ Error RPC crear_usuario:', rpcError);
                const msg = rpcError.message || '';
                // Errores que deben abortar (no se creó remotamente)
                const erroresCriticos = [
                    'Solo un administrador puede crear administradores',
                    'duplicate key value',
                    'violates unique constraint'
                ];
                const esCritico = erroresCriticos.some(t => msg.includes(t));
                if (esCritico) {
                    alert('Error guardando en Supabase: ' + msg);
                    return;
                }

                // Fallback optimista: actualizar UI localmente
                console.warn('⚠️ Continuando con actualización local (fallback). Verifica en Supabase si se creó el usuario.');
            }

            const remoto = (Array.isArray(rpcData) && rpcData.length > 0) ? rpcData[0] : {};

            // Mantener una copia local para la UI
            const nuevoUsuario = {
                id: remoto.id || generarId(),
                nombre: remoto.nombre || nombre,
                email: remoto.email || email,
                password: password,
                rol: remoto.rol || rol,
                estado: remoto.estado || 'activo',
                fechaCreacion: remoto.fecha_creacion || new Date().toISOString(),
                ultimoAcceso: remoto.ultimo_acceso || null,
                permisos: remoto.permisos || permisos
            };

            this.usuarios.push(nuevoUsuario);
            guardarUsuarios(this.usuarios);

            // Intentar crear también el usuario en Supabase Auth sin afectar la sesión actual
            try {
                if (window.supabaseConfig && typeof window.supabaseConfig.createTempClient === 'function') {
                    const tempClient = await window.supabaseConfig.createTempClient({
                        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
                    });
                    const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
                        email: email,
                        password: password
                    });
                    if (signUpError) {
                        console.warn('⚠️ No se pudo registrar en Supabase Auth (continuando):', signUpError.message || signUpError);
                        mostrarToast('Usuario creado, pero no se pudo registrar en Auth (puede ya existir o requerir confirmación).', 'warning');
                    } else {
                        mostrarToast('Usuario registrado en Supabase Auth', 'success');
                    }
                }
            } catch (authErr) {
                console.warn('⚠️ Error creando usuario en Supabase Auth (no bloqueante):', authErr);
                mostrarToast('Usuario creado, pero ocurrió un error registrando en Auth', 'warning');
            }
        } catch (error) {
            console.error('Error creando usuario en Supabase:', error);
            alert('Error guardando en Supabase: ' + (error?.message || 'Desconocido'));
            return;
        }

        // Limpiar formulario
        document.getElementById('formCrearUsuario').reset();
        this.limpiarPermisosFormulario();

        // Actualizar interfaz
        this.cargarUsuariosEnTabla();
        this.actualizarEstadisticas();

        mostrarToast('Usuario creado exitosamente', 'success');
    }

    editarUsuario(usuarioId) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        if (!usuario) return;

        this.usuarioEditando = usuarioId;

        // Llenar el formulario de edición
        document.getElementById('editarNombre').value = usuario.nombre;
        document.getElementById('editarEmail').value = usuario.email;
        document.getElementById('editarRol').value = usuario.rol;
        document.getElementById('editarEstado').value = usuario.estado;

        // Llenar permisos
        Object.keys(usuario.permisos).forEach(permiso => {
            const checkbox = document.getElementById(`editarPermiso_${permiso}`);
            if (checkbox) {
                checkbox.checked = usuario.permisos[permiso];
            }
        });

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
        modal.show();
    }

    guardarEdicionUsuario() {
        if (!this.usuarioEditando) return;

        const nombre = document.getElementById('editarNombre').value.trim();
        const email = document.getElementById('editarEmail').value.trim();
        const rol = document.getElementById('editarRol').value;
        const estado = document.getElementById('editarEstado').value;

        // Validaciones
        if (!nombre || !email || !rol) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }

        // Verificar que el email no existe (excepto el usuario actual)
        const emailExiste = this.usuarios.find(u => 
            u.id !== this.usuarioEditando && 
            u.email.toLowerCase() === email.toLowerCase()
        );
        
        if (emailExiste) {
            alert('Ya existe otro usuario con ese correo electrónico');
            return;
        }

        // Obtener permisos del formulario
        const permisos = {};
        Object.keys(obtenerPermisosPorDefecto()).forEach(permiso => {
            const checkbox = document.getElementById(`editarPermiso_${permiso}`);
            permisos[permiso] = checkbox ? checkbox.checked : false;
        });

        // Actualizar usuario
        const indiceUsuario = this.usuarios.findIndex(u => u.id === this.usuarioEditando);
        if (indiceUsuario !== -1) {
            this.usuarios[indiceUsuario] = {
                ...this.usuarios[indiceUsuario],
                nombre: nombre,
                email: email,
                rol: rol,
                estado: estado,
                permisos: permisos
            };

            guardarUsuarios(this.usuarios);

            // Actualizar interfaz
            this.cargarUsuariosEnTabla();
            this.actualizarEstadisticas();

            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario'));
            modal.hide();

            this.usuarioEditando = null;
            alert('Usuario actualizado exitosamente');
        }
    }

    eliminarUsuario(usuarioId) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        if (!usuario) return;

        if (confirm(`¿Estás seguro de que deseas eliminar al usuario "${usuario.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
            this.usuarios = this.usuarios.filter(u => u.id !== usuarioId);
            guardarUsuarios(this.usuarios);

            this.cargarUsuariosEnTabla();
            this.actualizarEstadisticas();

            alert('Usuario eliminado exitosamente');
        }
    }

    toggleEstadoUsuario(usuarioId) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        if (!usuario) return;

        const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
        const accion = nuevoEstado === 'activo' ? 'activar' : 'desactivar';

        if (confirm(`¿Estás seguro de que deseas ${accion} al usuario "${usuario.nombre}"?`)) {
            usuario.estado = nuevoEstado;
            guardarUsuarios(this.usuarios);

            this.cargarUsuariosEnTabla();
            this.actualizarEstadisticas();
        }
    }

    cargarUsuariosEnTabla() {
        this.aplicarFiltros();
    }

    aplicarFiltros() {
        const filtroRol = document.getElementById('filtroRol')?.value || '';
        const filtroEstado = document.getElementById('filtroEstado')?.value || '';
        const buscar = document.getElementById('buscarUsuario')?.value.toLowerCase() || '';

        let usuariosFiltrados = this.usuarios.filter(usuario => {
            const matchRol = !filtroRol || usuario.rol === filtroRol;
            const matchEstado = !filtroEstado || usuario.estado === filtroEstado;
            const matchBuscar = !buscar || 
                usuario.nombre.toLowerCase().includes(buscar) ||
                usuario.email.toLowerCase().includes(buscar);

            return matchRol && matchEstado && matchBuscar;
        });

        this.actualizarTablaUsuarios(usuariosFiltrados);
    }

    actualizarTablaUsuarios(usuarios) {
        const tbody = document.querySelector('#tablaUsuarios tbody');
        if (!tbody) return;

        if (usuarios.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <div class="text-muted">
                            <i class="fas fa-users fa-3x mb-3"></i>
                            <h6>No se encontraron usuarios</h6>
                            <p class="mb-0">Ajusta los filtros o crea un nuevo usuario</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = usuarios.map(usuario => {
            const iniciales = generarIniciales(usuario.nombre);
            const ultimoAcceso = usuario.ultimoAcceso 
                ? this.calcularTiempoTranscurrido(new Date(usuario.ultimoAcceso))
                : 'Nunca';

            const estadoBadge = this.obtenerBadgeEstado(usuario.estado);
            const rolBadge = this.obtenerBadgeRol(usuario.rol);

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="user-avatar me-2">${iniciales}</div>
                            <div>
                                <div class="fw-semibold">${usuario.nombre}</div>
                                <small class="text-muted">${usuario.email}</small>
                            </div>
                        </div>
                    </td>
                    <td>${rolBadge}</td>
                    <td>${ultimoAcceso}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary" onclick="window.gestorUsuarios.verPermisos('${usuario.id}')" title="Ver permisos">
                                <i class="fas fa-shield-alt"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="window.gestorUsuarios.editarUsuario('${usuario.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="window.gestorUsuarios.cambiarPassword('${usuario.id}')" title="Cambiar contraseña">
                                <i class="fas fa-key"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="window.gestorUsuarios.toggleEstadoUsuario('${usuario.id}')" title="Cambiar estado">
                                <i class="fas fa-toggle-${usuario.estado === 'activo' ? 'on' : 'off'}"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="window.gestorUsuarios.eliminarUsuario('${usuario.id}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    verPermisos(usuarioId) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        if (!usuario) return;

        // Mostrar modal con permisos del usuario
        document.getElementById('permisoUsuarioNombre').textContent = usuario.nombre;
        document.getElementById('permisoUsuarioRol').textContent = usuario.rol;

        const permisosContainer = document.getElementById('permisosUsuarioDetalle');
        const modulos = {
            dashboard: 'Dashboard',
            salas: 'Gestión de Salas',
            ventas: 'Ventas',
            gastos: 'Gastos',
            stock: 'Stock',
            reportes: 'Reportes',
            usuarios: 'Usuarios',
            ajustes: 'Ajustes'
        };

        permisosContainer.innerHTML = Object.entries(modulos).map(([permiso, nombre]) => {
            const tienePermiso = usuario.permisos[permiso];
            const iconoClass = tienePermiso ? 'fas fa-check text-success' : 'fas fa-times text-danger';
            const estadoClass = tienePermiso ? 'text-success' : 'text-muted';
            
            return `
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <span class="${estadoClass}">${nombre}</span>
                    <i class="${iconoClass}"></i>
                </div>
            `;
        }).join('');

        const modal = new bootstrap.Modal(document.getElementById('modalVerPermisos'));
        modal.show();
    }

    obtenerBadgeEstado(estado) {
        const badges = {
            'activo': '<span class="badge bg-success">Activo</span>',
            'inactivo': '<span class="badge bg-secondary">Inactivo</span>',
            'bloqueado': '<span class="badge bg-danger">Bloqueado</span>'
        };
        return badges[estado] || '<span class="badge bg-secondary">Desconocido</span>';
    }

    obtenerBadgeRol(rol) {
        const badges = {
            'administrador': '<span class="badge bg-danger">Administrador</span>',
            'supervisor': '<span class="badge bg-warning">Supervisor</span>',
            'operador': '<span class="badge bg-info">Operador</span>',
            'vendedor': '<span class="badge bg-success">Vendedor</span>'
        };
        return badges[rol] || '<span class="badge bg-secondary">Sin Rol</span>';
    }

    calcularTiempoTranscurrido(fecha) {
        const ahora = new Date();
        const diferencia = ahora - fecha;
        
        const minutos = Math.floor(diferencia / (1000 * 60));
        const horas = Math.floor(diferencia / (1000 * 60 * 60));
        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

        if (minutos < 60) {
            return minutos <= 1 ? 'Hace un momento' : `Hace ${minutos} minutos`;
        } else if (horas < 24) {
            return horas === 1 ? 'Hace 1 hora' : `Hace ${horas} horas`;
        } else {
            return dias === 1 ? 'Hace 1 día' : `Hace ${dias} días`;
        }
    }

    actualizarEstadisticas() {
        const totalUsuarios = this.usuarios.length;
        const usuariosActivos = this.usuarios.filter(u => u.estado === 'activo').length;
        const usuariosBloqueados = this.usuarios.filter(u => u.estado === 'bloqueado').length;
        const sesionesActivas = this.usuarios.filter(u => {
            if (!u.ultimoAcceso) return false;
            const ultimoAcceso = new Date(u.ultimoAcceso);
            const ahoraHace5Min = new Date(Date.now() - 5 * 60 * 1000);
            return ultimoAcceso > ahoraHace5Min && u.estado === 'activo';
        }).length;

        // Actualizar tarjetas
        this.actualizarCard('totalUsuarios', totalUsuarios);
        this.actualizarCard('usuariosActivos', usuariosActivos);
        this.actualizarCard('sesionesActivas', sesionesActivas);
        this.actualizarCard('usuariosBloqueados', usuariosBloqueados);
    }

    actualizarCard(id, valor) {
        const elemento = document.querySelector(`[data-stat="${id}"]`);
        if (elemento) {
            elemento.textContent = valor;
        }
    }

    actualizarPermisosPorRol(rol) {
        const permisos = obtenerPermisosPorRol(rol);
        Object.entries(permisos).forEach(([permiso, activo]) => {
            const checkbox = document.querySelector(`input[name="permisos[]"][value="${permiso}"]`);
            if (checkbox) {
                checkbox.checked = activo;
            }
        });
    }

    actualizarPermisosEdicionPorRol(rol) {
        const permisos = obtenerPermisosPorRol(rol);
        Object.entries(permisos).forEach(([permiso, activo]) => {
            const checkbox = document.getElementById(`editarPermiso_${permiso}`);
            if (checkbox) {
                checkbox.checked = activo;
            }
        });
    }

    limpiarPermisosFormulario() {
        const checkboxes = document.querySelectorAll('input[name="permisos[]"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    // Abrir modal para cambiar contraseña
    cambiarPassword(usuarioId) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        if (!usuario) {
            alert('Usuario no encontrado');
            return;
        }

        // Llenar datos del modal
        document.getElementById('usuarioPasswordId').value = usuarioId;
        document.getElementById('usuarioPasswordNombre').textContent = usuario.nombre;
        
        // Limpiar campos
        document.getElementById('nuevaPassword').value = '';
        document.getElementById('confirmarPassword').value = '';
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalCambiarPassword'));
        modal.show();
    }

    // Cambiar contraseña del usuario
    async cambiarPasswordUsuario() {
        const usuarioId = document.getElementById('usuarioPasswordId').value;
        const nuevaPassword = document.getElementById('nuevaPassword').value;
        const confirmarPassword = document.getElementById('confirmarPassword').value;

        // Validaciones
        if (nuevaPassword.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (nuevaPassword !== confirmarPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        // Buscar usuario
        const usuarioIndex = this.usuarios.findIndex(u => u.id === usuarioId);
        if (usuarioIndex === -1) {
            alert('Usuario no encontrado');
            return;
        }

        // Actualizar contraseña en Supabase (hash + update)
        try {
            if (!window.databaseService || !window.supabaseConfig) {
                throw new Error('Supabase no disponible');
            }

            const client = await window.supabaseConfig.getSupabaseClient();

            // Verificar sesión Auth (necesaria si RLS está activo)
            try {
                const { data } = await client.auth.getUser();
                if (!data?.user) {
                    throw new Error('No hay sesión activa en Supabase Auth');
                }
            } catch (authErr) {
                console.warn('⚠️ Sesión Auth no verificada:', authErr?.message || authErr);
            }

            // 1) Hash en el servidor
            const { data: hashed, error: hashError } = await client.rpc('hash_password', { password: nuevaPassword });
            if (hashError || !hashed) {
                throw hashError || new Error('hash_password retornó vacío');
            }

            // 2) Update por ID (email puede variar/mayúsculas)
            const { data: updated, error: updError } = await client
                .from('usuarios')
                .update({ password_hash: hashed })
                .eq('id', usuarioId)
                .select('id')
                .maybeSingle();

            if (updError) throw updError;
            if (!updated?.id) throw new Error('No se actualizó ningún registro');

            // No guardar contraseña en localStorage
            mostrarToast('Contraseña actualizada en Supabase', 'success');

            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalCambiarPassword'));
            modal?.hide();

            // Recargar usuarios desde BD para reflejar cambios
            await this.cargarUsuarios();
            this.actualizarEstadisticas();
            this.cargarUsuariosEnTabla();
        } catch (e) {
            console.error('❌ Error actualizando contraseña en Supabase:', e);
            mostrarToast(`No se pudo actualizar en Supabase: ${e?.message || e}`, 'error');
        }
    }

    // Toggle para mostrar/ocultar contraseña
    togglePasswordVisibility(inputId, buttonId) {
        const input = document.getElementById(inputId);
        const button = document.getElementById(buttonId);
        const icon = button.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    // Sincronizar usuarios con el sistema de autenticación
    async sincronizarConAuth() {
        try {
            console.log('🔄 Sincronizando usuarios con Supabase Auth...');
            
            // Verificar si hay conexión a Supabase
            if (!window.databaseService || !window.supabaseConfig) {
                console.warn('⚠️ Supabase no disponible, usando solo localStorage');
                return;
            }

            const client = await window.supabaseConfig.getSupabaseClient();
            if (!client) {
                console.warn('⚠️ Cliente Supabase no disponible');
                return;
            }

            // 1. Obtener usuarios de la tabla usuarios
            const { data: usuariosBD, error } = await client
                .from('usuarios')
                .select('*')
                .order('fecha_creacion', { ascending: false });

            if (error) {
                console.error('❌ Error obteniendo usuarios de BD:', error);
                return;
            }

            console.log('✅ Usuarios obtenidos de BD:', usuariosBD?.length || 0);

            // 2. Obtener usuarios de Supabase Auth (solo admin puede ver esto)
            let usuariosAuth = [];
            try {
                const { data: authData, error: authError } = await client.auth.admin.listUsers();
                if (!authError && authData?.users) {
                    usuariosAuth = authData.users;
                    console.log('✅ Usuarios de Auth obtenidos:', usuariosAuth.length);
                }
            } catch (authErr) {
                console.warn('⚠️ No se pudo acceder a usuarios de Auth (requiere permisos admin)');
            }

            // 3. Sincronizar Auth -> Tabla Usuarios (crear usuarios faltantes en la tabla)
            const emailsAdministradores = [
                'maurochica23@gmail.com',
                'admin@gamecontrol.com',
                'admin@sonixtec.co'
            ];
            
            for (const authUser of usuariosAuth) {
                const existeEnTabla = usuariosBD?.find(u => u.email === authUser.email);
                const esAdmin = emailsAdministradores.includes(authUser.email.toLowerCase());
                const rolAsignado = esAdmin ? 'administrador' : 'operador';
                
                if (!existeEnTabla) {
                    // Crear usuario nuevo en la tabla
                    const permisosDefecto = obtenerPermisosPorRol(rolAsignado);
                    
                    console.log(`📝 Creando usuario en tabla desde Auth: ${authUser.email} (rol: ${rolAsignado})`);
                    try {
                        const { error: insertError } = await client
                            .from('usuarios')
                            .insert({
                                email: authUser.email,
                                nombre: authUser.user_metadata?.nombre || authUser.email.split('@')[0],
                                rol: rolAsignado,
                                estado: 'activo',
                                password_hash: 'managed_by_auth',
                                permisos: permisosDefecto
                            });
                        
                        if (insertError) {
                            console.error('❌ Error creando usuario en tabla:', insertError);
                        } else {
                            console.log(`✅ Usuario ${authUser.email} creado en tabla como ${rolAsignado}`);
                        }
                    } catch (err) {
                        console.error('❌ Error insertando usuario:', err);
                    }
                } else {
                    // Verificar y actualizar rol si es necesario
                    if (existeEnTabla.rol !== rolAsignado) {
                        console.log(`🔄 Actualizando rol de ${authUser.email}: ${existeEnTabla.rol} → ${rolAsignado}`);
                        try {
                            const permisosActualizados = obtenerPermisosPorRol(rolAsignado);
                            const { error: updateError } = await client
                                .from('usuarios')
                                .update({
                                    rol: rolAsignado,
                                    permisos: permisosActualizados
                                })
                                .eq('email', authUser.email);
                            
                            if (updateError) {
                                console.error('❌ Error actualizando rol:', updateError);
                            } else {
                                console.log(`✅ Rol actualizado correctamente`);
                            }
                        } catch (err) {
                            console.error('❌ Error al actualizar:', err);
                        }
                    } else {
                        console.log(`ℹ️ Usuario ${authUser.email} ya existe en tabla (rol: ${existeEnTabla.rol})`);
                    }
                }
            }

            // 4. Re-obtener usuarios actualizados
            const { data: usuariosActualizados } = await client
                .from('usuarios')
                .select('*')
                .order('fecha_creacion', { ascending: false });

            // 5. Sincronizar con localStorage
            if (usuariosActualizados && usuariosActualizados.length > 0) {
                this.usuarios = usuariosActualizados.map(u => ({
                    id: u.id,
                    nombre: u.nombre,
                    email: u.email,
                    password: u.password_hash || 'encrypted',
                    rol: u.rol,
                    estado: u.estado,
                    telefono: u.telefono || '',
                    direccion: u.direccion || '',
                    permisos: u.permisos || obtenerPermisosPorRol(u.rol),
                    fechaCreacion: u.fecha_creacion,
                    ultimoAcceso: u.ultimo_acceso
                }));
                
                guardarUsuarios(this.usuarios);
                console.log('✅ Usuarios sincronizados: Auth ↔️ BD ↔️ localStorage');
            }

        } catch (error) {
            console.error('❌ Error en sincronizarConAuth:', error);
        }
    }

    // Mapear roles del sistema local al sistema de auth
    mapearRol(rolLocal) {
        const mapeoRoles = {
            'administrador': 'Administrador',
            'supervisor': 'Supervisor',
            'operador': 'Operador',
            'vendedor': 'Operador'
        };
        return mapeoRoles[rolLocal] || 'Operador';
    }

    // Mapear permisos según el rol
    mapearPermisos(rol) {
        switch(rol.toLowerCase()) {
            case 'administrador':
                return ['todos'];
            case 'supervisor':
                return ['salas', 'ventas', 'reportes', 'gastos'];
            case 'operador':
                return ['salas', 'ventas'];
            case 'vendedor':
                return ['ventas'];
            default:
                return ['salas'];
        }
    }

    // Generar username único
    generarUsername(nombre, email) {
        const base = nombre.toLowerCase().replace(/\s+/g, '');
        const emailPart = email.split('@')[0].toLowerCase();
        return emailPart.length > 3 ? emailPart : base;
    }

    // Generar color para avatar
    generarColorAvatar() {
        const colores = ['#007bff', '#28a745', '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14'];
        return colores[Math.floor(Math.random() * colores.length)];
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.gestorUsuarios = new GestorUsuarios();
}); 