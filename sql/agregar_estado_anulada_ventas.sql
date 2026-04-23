-- 1) Ampliar el CHECK constraint de estado en ventas para incluir 'anulada'
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_estado_check;
ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_estado_check
  CHECK (estado IN ('abierta', 'cerrada', 'anulada'));

-- 2) Ampliar el CHECK constraint de metodo_pago para incluir 'parcial' y 'anulado'
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_metodo_pago_check;
ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_metodo_pago_check
  CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'digital', 'parcial', 'anulado'));

-- 3) Corregir RLS policy de INSERT en ventas para permitir ventas de tienda
--    donde usuario_id puede ser null (cuando auth no resuelve un usuario de la tabla usuarios)
DROP POLICY IF EXISTS ventas_insert ON public.ventas;
CREATE POLICY ventas_insert ON public.ventas
  FOR INSERT TO authenticated
  WITH CHECK (
    es_admin(auth.uid())
    OR usuario_id = auth.uid()
    OR usuario_id IS NULL   -- ventas de tienda sin usuario_id resuelto
  );

-- 4) Corregir RLS policy de SELECT para que todos los usuarios autenticados
--    vean ventas de tienda (usuario_id IS NULL)
DROP POLICY IF EXISTS ventas_select ON public.ventas;
CREATE POLICY ventas_select ON public.ventas
  FOR SELECT TO authenticated
  USING (
    es_admin(auth.uid())
    OR usuario_id = auth.uid()
    OR usuario_id IS NULL   -- ventas de tienda visibles para todos los autenticados
  );

-- 5) Corregir RLS policy de INSERT en venta_items para permitir items
--    de ventas de tienda (donde la venta padre tiene usuario_id IS NULL)
DROP POLICY IF EXISTS venta_items_insert ON public.venta_items;
CREATE POLICY venta_items_insert ON public.venta_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ventas v
      WHERE v.id = venta_items.venta_id
      AND (
        es_admin(auth.uid())
        OR v.usuario_id = auth.uid()
        OR v.usuario_id IS NULL
      )
    )
  );

-- 6) Corregir RLS policy de SELECT en venta_items para los mismos casos
DROP POLICY IF EXISTS venta_items_select ON public.venta_items;
CREATE POLICY venta_items_select ON public.venta_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ventas v
      WHERE v.id = venta_items.venta_id
      AND (
        es_admin(auth.uid())
        OR v.usuario_id = auth.uid()
        OR v.usuario_id IS NULL
      )
    )
  );

-- =====================================================================
-- DIAGNOSTICO: Ejecuta esto para ver el estado actual de ventas tienda
-- =====================================================================
-- SELECT id, cliente, estacion, fecha_cierre, metodo_pago, total, usuario_id, estado
-- FROM public.ventas
-- WHERE sesion_id IS NULL
-- ORDER BY fecha_cierre DESC
-- LIMIT 20;
