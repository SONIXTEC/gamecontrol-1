// ===================================================================
// GRID DE SALAS – Vista principal del módulo de salas
// ===================================================================

import { useState } from 'react';
import TarjetaSala from './TarjetaSala';
import ModalSesion from './ModalSesion';
import ModalAgregarTiempo from './ModalAgregarTiempo';
import ModalTienda from './ModalTienda';
import ModalFinalizarSesion from './ModalFinalizarSesion';
import ModalTrasladarSesion from './ModalTrasladarSesion';
import ModalTiempoCumplido from './ModalTiempoCumplido';

/**
 * @param {{
 *   salas: object[],
 *   sesiones: object[],
 * }} props
 */
export default function GridSalas({ salas = [], sesiones = [] }) {
  // Modal abrir sesión
  const [iniciarSesionData, setIniciarSesionData] = useState(null); // { sala, estacion }
  // Modal agregar tiempo
  const [agregarTiempoData, setAgregarTiempoData] = useState(null); // { sesion, sala }
  // Modal agregar productos
  const [agregarProductosData, setAgregarProductosData] = useState(null); // { sesion, sala }
  // Modal finalizar sesión
  const [finalizarData, setFinalizarData] = useState(null); // { sesion, sala }
  // Modal trasladar sesión
  const [trasladarData, setTrasladarData] = useState(null); // { sesion, sala }

  // Cola de alertas "tiempo cumplido"
  const [colaVencidas, setColaVencidas] = useState([]); // sesiones
  const sesionVencidaActiva = colaVencidas[0] ?? null;

  function handleVencido(sesion) {
    setColaVencidas((prev) => {
      const yaEsta = prev.some((s) => s.id === sesion.id);
      return yaEsta ? prev : [...prev, sesion];
    });
  }

  function cerrarAlertaVencida() {
    setColaVencidas((prev) => prev.slice(1));
  }

  const encontrarSala = (salaId) => salas.find((s) => s.id === salaId);

  function handleIniciar(salaId, estacion) {
    const sala = encontrarSala(salaId);
    if (sala) setIniciarSesionData({ sala, estacion });
  }

  function handleAgregarTiempo(sesion) {
    const sala = encontrarSala(sesion.salaId);
    if (sala) setAgregarTiempoData({ sesion, sala });
  }

  function handleAgregarProducto(sesion) {
    const sala = encontrarSala(sesion.salaId);
    if (sala) setAgregarProductosData({ sesion, sala });
  }

  function handleFinalizar(sesion) {
    const sala = encontrarSala(sesion.salaId);
    if (sala) setFinalizarData({ sesion, sala });
  }

  function handleTrasladar(sesion) {
    const sala = encontrarSala(sesion.salaId);
    if (sala) setTrasladarData({ sesion, sala });
  }

  return (
    <>
      {/* Grid de tarjetas de salas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {salas.map((sala) => (
          <TarjetaSala
            key={sala.id}
            sala={sala}
            sesiones={sesiones}
            onIniciar={handleIniciar}
            onAgregarTiempo={handleAgregarTiempo}
            onAgregarProducto={handleAgregarProducto}
            onFinalizar={handleFinalizar}
            onTrasladar={handleTrasladar}
            onVencido={handleVencido}
          />
        ))}
      </div>

      {/* Modales */}
      <ModalSesion
        sala={iniciarSesionData?.sala ?? null}
        estacion={iniciarSesionData?.estacion ?? null}
        onCerrar={() => setIniciarSesionData(null)}
      />

      <ModalAgregarTiempo
        sesion={agregarTiempoData?.sesion ?? null}
        sala={agregarTiempoData?.sala ?? null}
        onCerrar={() => setAgregarTiempoData(null)}
      />

      <ModalTienda
        abierto={!!agregarProductosData}
        sesion={agregarProductosData?.sesion ?? null}
        sala={agregarProductosData?.sala ?? null}
        onCerrar={() => setAgregarProductosData(null)}
      />

      <ModalFinalizarSesion
        sesion={finalizarData?.sesion ?? null}
        sala={finalizarData?.sala ?? null}
        onCerrar={() => setFinalizarData(null)}
      />
      <ModalTrasladarSesion
        sesion={trasladarData?.sesion ?? null}
        sala={trasladarData?.sala ?? null}
        salas={salas}
        sesiones={sesiones}
        onCerrar={() => setTrasladarData(null)}
      />

      {/* Popup de tiempo cumplido (cola) */}
      <ModalTiempoCumplido
        sesion={sesionVencidaActiva}
        sala={sesionVencidaActiva ? encontrarSala(sesionVencidaActiva.salaId) : null}
        onCerrar={cerrarAlertaVencida}
        onAgregarTiempo={(s) => { cerrarAlertaVencida(); handleAgregarTiempo(s); }}
        onFinalizar={(s) => { cerrarAlertaVencida(); handleFinalizar(s); }}
      />
    </>
  );
}
