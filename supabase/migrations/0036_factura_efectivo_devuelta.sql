-- Con cuánto pagó el cliente (efectivo) y la devuelta (vuelto), para mostrarlos
-- en el recibo. Se llenan al cobrar en Caja cuando el pago es en efectivo.
alter table public.facturas add column if not exists efectivo_recibido numeric;
alter table public.facturas add column if not exists devuelta numeric;
