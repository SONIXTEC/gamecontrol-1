/**
 * Dashboard Principal - Sistema de Gestión de Salas Gaming
 * Gestiona las métricas, gráficos y datos en tiempo real del dashboard
 */

class DashboardManager {
    constructor() {
        this.charts = {};
        this.intervalos = [];
        this.datos = {
            sesiones: [],
            gastos: [],
            salas: [],
            productos: [],
            configuracion: {}
        };
        
        this.init();
    }

    init() {
        this.cargarDatos();
        this.configurarEventListeners();
        this.inicializarGraficos();
        this.actualizarMetricas();
        this.iniciarActualizacionAutomatica();
        
        console.log('✅ Dashboard Manager inicializado');
    }

    // ===== CARGA DE DATOS =====
    cargarDatos() {
        try {
            this.datos.sesiones = JSON.parse(localStorage.getItem('sesiones') || '[]');
            this.datos.gastos = JSON.parse(localStorage.getItem('gastos') || '[]');
            this.datos.salas = JSON.parse(localStorage.getItem('salas') || '[]');
            this.datos.productos = JSON.parse(localStorage.getItem('productos_stock') || '[]');
            this.datos.configuracion = JSON.parse(localStorage.getItem('configuracion') || '{}');
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.mostrarNotificacion('Error cargando datos del sistema', 'error');
        }
    }

    // ===== MÉTRICAS Y CÁLCULOS =====
    calcularMetricasHoy() {
        const hoy = new Date().toDateString();
        const sesionesHoy = this.datos.sesiones.filter(s => 
            new Date(s.fechaInicio).toDateString() === hoy
        );
        const gastosHoy = this.datos.gastos.filter(g => 
            new Date(g.fecha).toDateString() === hoy
        );

        // Ingresos del día
        const ingresosDia = sesionesHoy.reduce((total, sesion) => {
            return total + (sesion.costoTotal || 0);
        }, 0);

        // Clientes activos (sesiones sin finalizar)
        const clientesActivos = sesionesHoy.filter(s => !s.fechaFin && !s.finalizada).length;
        const totalClientesDia = sesionesHoy.length;

        // Ocupación de salas - calcular basado en estaciones ocupadas
        const sesionesActivas = this.datos.sesiones.filter(s => !s.fechaFin && !s.finalizada);
        const totalEstaciones = this.datos.salas.reduce((sum, sala) => sum + (sala.numEstaciones || 0), 0);
        const estacionesOcupadas = sesionesActivas.length;
        const porcentajeOcupacion = totalEstaciones > 0 ? (estacionesOcupadas / totalEstaciones) * 100 : 0;

        // Ticket promedio
        const ticketPromedio = totalClientesDia > 0 ? ingresosDia / totalClientesDia : 0;

        return {
            ingresosDia,
            clientesActivos,
            totalClientesDia,
            estacionesOcupadas,
            totalEstaciones,
            porcentajeOcupacion,
            ticketPromedio,
            gastosHoy: gastosHoy.reduce((total, g) => total + g.monto, 0)
        };
    }

    calcularMetricasMes() {
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);
        
        const sesioneMes = this.datos.sesiones.filter(s => 
            new Date(s.fechaInicio) >= fechaInicio
        );
        const gastosMes = this.datos.gastos.filter(g => 
            new Date(g.fecha) >= fechaInicio
        );

        const ingresosMes = sesioneMes.reduce((total, s) => total + (s.costoTotal || 0), 0);
        const gastosTotalMes = gastosMes.reduce((total, g) => total + g.monto, 0);
        const beneficioMes = ingresosMes - gastosTotalMes;
        const margenBeneficio = ingresosMes > 0 ? (beneficioMes / ingresosMes) * 100 : 0;

        // Metas (ejemplo - se pueden configurar)
        const metaIngresos = this.datos.configuracion.metaIngresosMensual || 50000;
        const presupuestoGastos = this.datos.configuracion.presupuestoGastosMensual || 20000;

        return {
            ingresosMes,
            gastosMes: gastosTotalMes,
            beneficioMes,
            margenBeneficio,
            metaIngresos,
            presupuestoGastos,
            progresoIngresos: (ingresosMes / metaIngresos) * 100,
            progresoGastos: (gastosTotalMes / presupuestoGastos) * 100
        };
    }

    // ===== ACTUALIZACIÓN DE MÉTRICAS EN UI =====
    actualizarMetricas() {
        const metricas = this.calcularMetricasHoy();
        const metricasMes = this.calcularMetricasMes();

        // KPIs principales
        this.actualizarElemento('ingresosDia', this.formatearMoneda(metricas.ingresosDia));
        this.actualizarElemento('clientesActivos', metricas.clientesActivos);
        this.actualizarElemento('totalClientes', `Total del día: ${metricas.totalClientesDia}`);
        this.actualizarElemento('ocupacionSalas', `${Math.round(metricas.porcentajeOcupacion)}%`);
        this.actualizarElemento('salasStats', `${metricas.estacionesOcupadas}/${metricas.totalEstaciones} estaciones ocupadas`);
        this.actualizarElemento('ticketPromedio', this.formatearMoneda(metricas.ticketPromedio));

        // Métricas mensuales
        this.actualizarElemento('ingresosMes', this.formatearMoneda(metricasMes.ingresosMes));
        this.actualizarElemento('gastosMes', this.formatearMoneda(metricasMes.gastosMes));
        this.actualizarElemento('beneficioMes', this.formatearMoneda(metricasMes.beneficioMes));
        this.actualizarElemento('margenBeneficio', `Margen: ${metricasMes.margenBeneficio.toFixed(1)}%`);
        this.actualizarElemento('metaIngresosMes', `Meta: ${this.formatearMoneda(metricasMes.metaIngresos)}`);
        this.actualizarElemento('presupuestoMes', `Presupuesto: ${this.formatearMoneda(metricasMes.presupuestoGastos)}`);

        // Barras de progreso
        this.actualizarProgreso('progresoIngresosMes', Math.min(metricasMes.progresoIngresos, 100));
        this.actualizarProgreso('progresoGastosMes', Math.min(metricasMes.progresoGastos, 100));
        
        // Color del beneficio
        const elementoBeneficio = document.getElementById('beneficioMes');
        if (elementoBeneficio) {
            if (metricasMes.beneficioMes > 0) {
                elementoBeneficio.className = 'mb-2 text-success';
            } else if (metricasMes.beneficioMes < 0) {
                elementoBeneficio.className = 'mb-2 text-danger';
            } else {
                elementoBeneficio.className = 'mb-2 text-muted';
            }
        }

        // Progreso del beneficio
        const progresoBeneficio = document.getElementById('progresoBeneficio');
        if (progresoBeneficio) {
            if (metricasMes.beneficioMes > 0) {
                progresoBeneficio.className = 'progress-bar bg-success';
                progresoBeneficio.style.width = `${Math.min(metricasMes.margenBeneficio * 2, 100)}%`;
            } else {
                progresoBeneficio.className = 'progress-bar bg-danger';
                progresoBeneficio.style.width = '0%';
            }
        }

        this.actualizarSesionesActivas();
        this.actualizarActividadReciente();
        this.actualizarAlertas();
        this.actualizarEstadoStock();
        
        // Integrar con sistema de notificaciones si está disponible
        if (window.notificationSystem) {
            this.enviarNotificacionesEspeciales(metricas, metricasMes);
        }
    }

    actualizarElemento(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    }

    actualizarProgreso(id, porcentaje) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.style.width = `${porcentaje}%`;
        }
    }

    // ===== SESIONES ACTIVAS =====
    actualizarSesionesActivas() {
        const sesionesActivas = this.datos.sesiones.filter(s => !s.fechaFin && !s.finalizada);
        const tbody = document.getElementById('tablaSesionesActivas');
        const badge = document.getElementById('totalSesionesActivas');
        
        if (badge) badge.textContent = sesionesActivas.length;

        if (!tbody) return;

        if (sesionesActivas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-clock fa-2x mb-2"></i><br>
                        No hay sesiones activas
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sesionesActivas.map(sesion => {
            const sala = this.datos.salas.find(s => s.id === sesion.salaId);
            const tiempoTranscurrido = this.calcularTiempoTranscurrido(sesion.fechaInicio);
            const costoActual = this.calcularCostoSesion(sesion, sala);

            return `
                <tr>
                    <td>
                        <span class="badge bg-primary">${sala ? sala.nombre : 'N/A'}</span>
                    </td>
                    <td>${sesion.cliente || 'Anónimo'}</td>
                    <td>${tiempoTranscurrido}</td>
                    <td>${this.formatearMoneda(costoActual)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="dashboard.finalizarSesion('${sesion.id}')">
                            <i class="fas fa-stop"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ===== ACTIVIDAD RECIENTE =====
    actualizarActividadReciente() {
        const contenedor = document.getElementById('actividadReciente');
        if (!contenedor) return;

        // Combinar sesiones y gastos recientes
        const actividades = [];

        // Últimas 5 sesiones
        const sesionesRecientes = [...this.datos.sesiones]
            .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
            .slice(0, 3);

        sesionesRecientes.forEach(sesion => {
            const sala = this.datos.salas.find(s => s.id === sesion.salaId);
            actividades.push({
                tipo: 'sesion',
                fecha: sesion.fechaInicio,
                titulo: `Nueva sesión en ${sala ? sala.nombre : 'Sala'}`,
                descripcion: `${sesion.cliente || 'Cliente anónimo'} - ${this.formatearMoneda(sesion.costoTotal || 0)}`,
                icono: 'fas fa-play',
                color: 'primary'
            });
        });

        // Últimos 2 gastos
        const gastosRecientes = [...this.datos.gastos]
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 2);

        gastosRecientes.forEach(gasto => {
            actividades.push({
                tipo: 'gasto',
                fecha: gasto.fecha,
                titulo: `Nuevo gasto: ${gasto.categoria}`,
                descripcion: `${gasto.descripcion} - ${this.formatearMoneda(gasto.monto)}`,
                icono: 'fas fa-credit-card',
                color: 'danger'
            });
        });

        // Ordenar por fecha
        actividades.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (actividades.length === 0) {
            contenedor.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-history fa-2x mb-2"></i><br>
                    No hay actividad reciente
                </div>
            `;
            return;
        }

        contenedor.innerHTML = actividades.map(actividad => `
            <div class="activity-item d-flex align-items-start mb-3">
                <div class="activity-icon me-3">
                    <div class="rounded-circle bg-${actividad.color} bg-opacity-10 text-${actividad.color} d-flex align-items-center justify-content-center" 
                         style="width: 40px; height: 40px;">
                        <i class="${actividad.icono}"></i>
                    </div>
                </div>
                <div class="activity-content flex-grow-1">
                    <h6 class="mb-1">${actividad.titulo}</h6>
                    <p class="text-muted mb-1 small">${actividad.descripcion}</p>
                    <small class="text-muted">${this.formatearFechaRelativa(actividad.fecha)}</small>
                </div>
            </div>
        `).join('');
    }

    // ===== ALERTAS DEL SISTEMA =====
    actualizarAlertas() {
        const contenedor = document.getElementById('alertasSistema');
        if (!contenedor) return;

        const alertas = [];

        // Alertas de stock bajo
        this.datos.productos.forEach(producto => {
            if (producto.cantidad <= (producto.stockMinimo || 5)) {
                alertas.push({
                    tipo: 'warning',
                    icono: 'fas fa-exclamation-triangle',
                    titulo: 'Stock bajo',
                    mensaje: `${producto.nombre}: ${producto.cantidad} unidades`
                });
            }
        });

        // Alertas de salas con problemas
        this.datos.salas.forEach(sala => {
            if (sala.estado === 'mantenimiento') {
                alertas.push({
                    tipo: 'info',
                    icono: 'fas fa-tools',
                    titulo: 'Mantenimiento',
                    mensaje: `${sala.nombre} en mantenimiento`
                });
            }
        });

        // Alertas financieras
        const metricasMes = this.calcularMetricasMes();
        if (metricasMes.progresoGastos > 90) {
            alertas.push({
                tipo: 'danger',
                icono: 'fas fa-exclamation-circle',
                titulo: 'Presupuesto agotándose',
                mensaje: `Gastos al ${metricasMes.progresoGastos.toFixed(1)}% del presupuesto`
            });
        }

        if (alertas.length === 0) {
            contenedor.innerHTML = `
                <div class="text-center text-success py-4">
                    <i class="fas fa-check-circle fa-2x mb-2"></i><br>
                    <small>Todo funcionando correctamente</small>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = alertas.map(alerta => `
            <div class="alert alert-${alerta.tipo} alert-dismissible fade show py-2 mb-2">
                <i class="${alerta.icono} me-2"></i>
                <strong>${alerta.titulo}:</strong> ${alerta.mensaje}
                <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="alert"></button>
            </div>
        `).join('');
    }

    // ===== ESTADO DEL STOCK =====
    actualizarEstadoStock() {
        const contenedor = document.getElementById('estadoStock');
        if (!contenedor) return;

        const categorias = {};
        this.datos.productos.forEach(producto => {
            const cat = producto.categoria || 'Sin categoría';
            if (!categorias[cat]) {
                categorias[cat] = { total: 0, valor: 0 };
            }
            categorias[cat].total += producto.cantidad;
            categorias[cat].valor += producto.cantidad * producto.precio;
        });

        const totalProductos = this.datos.productos.reduce((sum, p) => sum + p.cantidad, 0);
        const valorTotal = this.datos.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);

        contenedor.innerHTML = `
            <div class="row g-2 mb-3">
                <div class="col-6">
                    <div class="text-center">
                        <h5 class="mb-0">${totalProductos}</h5>
                        <small class="text-muted">Productos total</small>
                    </div>
                </div>
                <div class="col-6">
                    <div class="text-center">
                        <h5 class="mb-0">${this.formatearMoneda(valorTotal)}</h5>
                        <small class="text-muted">Valor inventario</small>
                    </div>
                </div>
            </div>
            ${Object.entries(categorias).map(([categoria, datos]) => `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small">${categoria}</span>
                    <span class="badge bg-secondary">${datos.total}</span>
                </div>
            `).join('')}
        `;
    }

    // ===== GRÁFICOS =====
    inicializarGraficos() {
        this.crearGraficoIngresos();
        this.crearGraficoDistribucionSalas();
    }

    crearGraficoIngresos() {
        const ctx = document.getElementById('ingresoChart');
        if (!ctx) return;

        // Datos de ingresos por día (últimos 7 días)
        const datos = this.obtenerDatosIngresosSemana();

        this.charts.ingresos = new Chart(ctx, {
            type: 'line',
            data: {
                labels: datos.labels,
                datasets: [{
                    label: 'Ingresos Diarios',
                    data: datos.ingresos,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => this.formatearMoneda(value)
                        }
                    }
                }
            }
        });
    }

    crearGraficoDistribucionSalas() {
        const ctx = document.getElementById('distribucionSalasChart');
        if (!ctx) return;

        const datos = this.obtenerDistribucionSalas();

        this.charts.distribucion = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: datos.labels,
                datasets: [{
                    data: datos.valores,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    obtenerDatosIngresosSemana() {
        const labels = [];
        const ingresos = [];
        
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            
            const fechaStr = fecha.toDateString();
            const sesionesDelDia = this.datos.sesiones.filter(s => 
                new Date(s.fechaInicio).toDateString() === fechaStr
            );
            
            const ingresoDelDia = sesionesDelDia.reduce((total, s) => total + (s.costoTotal || 0), 0);
            
            labels.push(fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
            ingresos.push(ingresoDelDia);
        }
        
        return { labels, ingresos };
    }

    obtenerDistribucionSalas() {
        const distribucion = {};
        
        this.datos.sesiones.forEach(sesion => {
            const sala = this.datos.salas.find(s => s.id === sesion.salaId);
            const nombreSala = sala ? sala.nombre : 'Sala Desconocida';
            
            if (!distribucion[nombreSala]) {
                distribucion[nombreSala] = 0;
            }
            distribucion[nombreSala] += sesion.costoTotal || 0;
        });

        return {
            labels: Object.keys(distribucion),
            valores: Object.values(distribucion)
        };
    }

    // ===== FUNCIONES DE SESIONES =====
    finalizarSesion(sesionId) {
        const sesion = this.datos.sesiones.find(s => s.id === sesionId);
        if (!sesion) return;

        sesion.fechaFin = new Date().toISOString();
        sesion.costoTotal = this.calcularCostoFinal(sesion);

        // Liberar sala
        const sala = this.datos.salas.find(s => s.id === sesion.salaId);
        if (sala) {
            sala.estado = 'disponible';
            sala.clienteActual = null;
        }

        // Guardar cambios
        localStorage.setItem('sesiones', JSON.stringify(this.datos.sesiones));
        localStorage.setItem('salas', JSON.stringify(this.datos.salas));

        this.actualizarMetricas();
        this.mostrarNotificacion('Sesión finalizada correctamente', 'success');
    }

    // ===== NOTIFICACIONES ESPECIALES =====
    enviarNotificacionesEspeciales(metricas, metricasMes) {
        // Notificar capacidad crítica
        if (metricas.porcentajeOcupacion >= 95) {
            window.notificationSystem.addNotification(
                'danger',
                'Capacidad Máxima',
                `${metricas.porcentajeOcupacion.toFixed(0)}% de ocupación - ¡Sistema al límite!`,
                { type: 'capacity-critical', urgent: true }
            );
        } else if (metricas.porcentajeOcupacion >= 85) {
            window.notificationSystem.addNotification(
                'warning',
                'Alta Ocupación',
                `${metricas.porcentajeOcupacion.toFixed(0)}% de ocupación - Preparar expansión`,
                { type: 'capacity-high' }
            );
        }

        // Notificar metas de ingresos
        if (metricasMes.progresoIngresos >= 100) {
            window.notificationSystem.addNotification(
                'success',
                '¡Meta Alcanzada!',
                `Meta mensual de ingresos completada: ${this.formatearMoneda(metricasMes.ingresosMes)}`,
                { type: 'goal-achieved' }
            );
        } else if (metricasMes.progresoIngresos >= 90) {
            window.notificationSystem.addNotification(
                'info',
                'Cerca de la Meta',
                `${metricasMes.progresoIngresos.toFixed(0)}% de la meta mensual alcanzada`,
                { type: 'goal-progress' }
            );
        }

        // Alertas financieras críticas
        if (metricasMes.beneficioMes < 0) {
            window.notificationSystem.addNotification(
                'danger',
                'Pérdidas este Mes',
                `Déficit de ${this.formatearMoneda(Math.abs(metricasMes.beneficioMes))} - Revisar gastos`,
                { type: 'financial-loss', persistent: true }
            );
        }

        // Día sin actividad
        if (metricas.totalClientesDia === 0 && new Date().getHours() >= 12) {
            window.notificationSystem.addNotification(
                'warning',
                'Sin Actividad',
                'No se han registrado clientes hoy - Considerar promociones',
                { type: 'no-activity' }
            );
        }

        // Ticket promedio bajo
        const ticketPromedioPrevio = this.obtenerTicketPromedioPrevio();
        if (metricas.ticketPromedio > 0 && ticketPromedioPrevio > 0) {
            const cambioTicket = ((metricas.ticketPromedio - ticketPromedioPrevio) / ticketPromedioPrevio) * 100;
            if (cambioTicket < -20) {
                window.notificationSystem.addNotification(
                    'warning',
                    'Ticket Promedio Bajo',
                    `Disminución del ${Math.abs(cambioTicket).toFixed(0)}% en el ticket promedio`,
                    { type: 'ticket-decline' }
                );
            }
        }
    }

    obtenerTicketPromedioPrevio() {
        // Calcular ticket promedio del día anterior
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const sesionesAyer = this.datos.sesiones.filter(s => 
            new Date(s.fechaInicio).toDateString() === ayer.toDateString()
        );
        
        if (sesionesAyer.length === 0) return 0;
        
        const ingresosAyer = sesionesAyer.reduce((total, s) => total + (s.costoTotal || 0), 0);
        return ingresosAyer / sesionesAyer.length;
    }

    // ===== UTILIDADES =====
    calcularTiempoTranscurrido(fechaInicio) {
        const inicio = new Date(fechaInicio);
        const ahora = new Date();
        const diferencia = ahora - inicio;
        
        const horas = Math.floor(diferencia / (1000 * 60 * 60));
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${horas}:${minutos.toString().padStart(2, '0')}`;
    }

    calcularCostoSesion(sesion, sala) {
        if (!sala) return 0;
        
        const inicio = new Date(sesion.fechaInicio);
        const ahora = new Date();
        const horasTranscurridas = (ahora - inicio) / (1000 * 60 * 60);
        
        return Math.ceil(horasTranscurridas) * (sala.tarifaHora || 0);
    }

    calcularCostoFinal(sesion) {
        const sala = this.datos.salas.find(s => s.id === sesion.salaId);
        if (!sala) return 0;
        
        const inicio = new Date(sesion.fechaInicio);
        const fin = new Date(sesion.fechaFin);
        const horasTranscurridas = (fin - inicio) / (1000 * 60 * 60);
        
        return Math.ceil(horasTranscurridas) * (sala.tarifaHora || 0);
    }

    formatearMoneda(valor) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(valor);
    }

    formatearFechaRelativa(fecha) {
        const ahora = new Date();
        const fechaObj = new Date(fecha);
        const diferencia = ahora - fechaObj;
        
        const minutos = Math.floor(diferencia / (1000 * 60));
        const horas = Math.floor(diferencia / (1000 * 60 * 60));
        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        
        if (minutos < 60) {
            return `hace ${minutos} min`;
        } else if (horas < 24) {
            return `hace ${horas}h`;
        } else {
            return `hace ${dias} días`;
        }
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        // Usar el sistema de notificaciones global si está disponible
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion(mensaje, tipo);
        } else {
            console.log(`${tipo.toUpperCase()}: ${mensaje}`);
        }
    }

    // ===== EVENT LISTENERS =====
    configurarEventListeners() {
        // Filtros de período para gráficos
        document.querySelectorAll('input[name="periodoGrafico"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.actualizarGraficosPorPeriodo(radio.value);
            });
        });

        // Actualización manual
        const btnActualizar = document.querySelector('.btn-actualizar-dashboard');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => {
                this.cargarDatos();
                this.actualizarMetricas();
                this.mostrarNotificacion('Dashboard actualizado', 'success');
            });
        }
    }

    actualizarGraficosPorPeriodo(periodo) {
        // Actualizar datos según el período seleccionado
        // TODO: Implementar lógica para diferentes períodos
        console.log('Actualizando gráficos para período:', periodo);
    }

    // ===== ACTUALIZACIÓN AUTOMÁTICA =====
    iniciarActualizacionAutomatica() {
        // Actualizar métricas cada 30 segundos
        const intervalo = setInterval(() => {
            this.cargarDatos();
            this.actualizarMetricas();
        }, 30000);
        
        this.intervalos.push(intervalo);
    }

    destruir() {
        // Limpiar intervalos
        this.intervalos.forEach(clearInterval);
        
        // Destruir gráficos
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        
        console.log('🧹 Dashboard Manager destruido');
    }
}

// ===== INICIALIZACIÓN =====
let dashboard;

document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardManager();
});

// Limpiar al salir de la página
window.addEventListener('beforeunload', () => {
    if (dashboard) {
        dashboard.destruir();
    }
});

// Exportar para uso global
window.dashboard = dashboard; 