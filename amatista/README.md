# Amatista Dental — montaje de la clínica (modelo "base por cliente")

Amatista Dental es un **cliente nuevo** montado con el modelo *base por cliente*
estilo Infoplus: tiene su **propia base de datos aislada** y entra por el portal
central **nexusprord.com** escribiendo `usuario@amatista` (el `@` enruta a su base).

Una clínica dental es estructuralmente igual a Deluxe (citas, servicios/tratamientos,
clientes/pacientes, facturación y caja), por eso se **clonó el esquema de Deluxe** a
la base propia de Amatista y se le añadieron los módulos odontológicos.

## Coordenadas

| Dato | Valor |
|---|---|
| Base de datos (Supabase) | **Amatista Dental** — `sdxyqaawxomnfhyaxuyo` |
| URL de la base | `https://sdxyqaawxomnfhyaxuyo.supabase.co` |
| Región | us-east-1 · Costo: US$10/mes (4.º proyecto de la organización) |
| Directorio central | NEXUS PRO Seguros — `tnwsgcxurfyuszxsewsn`, tabla `organizaciones` |
| Slug / ruteo | `amatista` · `email_dominio = @amatista.local` |
| Color de marca | Dorado `#C9A227` (acento morado amatista pendiente en el front) |
| Login admin | en el portal central: **`admin@amatista`** (correo real `admin@amatista.local`) |

> La **contraseña temporal** del admin se entregó por chat y **debe cambiarse en el
> primer ingreso**. No se versiona aquí.

## Decisiones del dueño (incorporadas)

1. **Extras dentales:** odontograma + historia clínica + presupuestos de tratamiento (los 3).
2. **Acceso:** portal central `nexusprord.com` con `usuario@amatista`.
3. **Usuarios:** solo un admin ahora; el resto se crea luego desde el sistema.

## Qué se hizo en la base (estado: COMPLETADO)

1. **Base propia creada** y aislada para Amatista.
2. **Clon fiel del esquema de Deluxe** (migraciones 0001–0035 del repo, re-aplicadas).
   Se verificó que la lista de columnas de la base de Amatista es **idéntica** a la
   base viva de Deluxe. Se omitieron 3 sentencias que referencian funciones *legado*
   inexistentes en una base limpia (`get_user_effective_permissions`,
   `rls_auto_enable`, `run_auto_facturacion`). También se replicó la divergencia
   `cita_servicios.empleado_id` (existe en la base viva de Deluxe pero no en sus
   archivos de migración).
3. **Módulos dentales** (`amatista/migrations/0036_*`): `odontograma`,
   `historias_clinicas`, `historia_evoluciones`, `presupuestos`, `presupuesto_items`.
   Todas con RLS gated por `auth_tiene('clientes')` / `auth_tiene('facturacion')`.
4. **Rebranding a nivel de datos** (`0037_*`): nombre del negocio = *Amatista Dental*,
   rol *Estilista* → *Odontólogo/a*, categorías odontológicas, y un catálogo inicial
   de ~25 tratamientos con **precio 0** (la dueña fija tarifas en Configuración).
5. **Usuario admin** (`0038_*`) y **registro en el directorio NEXUS** (`0039_*`).

## Migraciones de esta carpeta

- `0036_dental_modulos_odontograma_historia_presupuestos.sql` — se aplica en la base de Amatista.
- `0037_branding_categorias_y_tratamientos.sql` — se aplica en la base de Amatista.
- `0038_usuario_admin.sql` — se aplica en la base de Amatista (sustituir contraseña).
- `0039_registro_directorio_nexus.sql` — se aplica en la base de **NEXUS** (sustituir anon key).

El esquema base 0001–0035 es el del repo Deluxe (`supabase/migrations/`); no se
duplica aquí. Para reconstruir la base de Amatista desde cero: aplicar 0001–0035 de
Deluxe (sin las 3 líneas legado y con `cita_servicios.empleado_id`), luego 0036–0038.

## Notas de seguridad (heredadas del molde Deluxe)

Los *advisors* de Supabase marcan los mismos WARN que la base de Deluxe (RLS
permisiva en `devoluciones`/`factura_pagos`/`mobiliario`, bucket público de
`mobiliario`, funciones `SECURITY DEFINER` que la app invoca por RPC, y la
protección de contraseñas filtradas de Auth desactivada). Se mantiene la misma
postura que la base original para que el clon sea fiel; endurecer en conjunto si se
decide para ambas.

## Pendiente (fuera del alcance de esta sesión)

El **frontend** (logo dorado del diente, color/acento, renombrar "Servicios" a
"Tratamientos" en la UI, y las pantallas de odontograma / historia clínica /
presupuestos) vive en el portal central **nexus-pro**, que **no está en el alcance
de este repo/sesión**. La base ya queda lista para enchufarse:

- El portal lee `color` (#C9A227) y `email_dominio` desde `organizaciones`.
- Las tablas dentales ya existen y respetan el modelo de permisos por rol.

Otros pendientes a definir con el dueño:

- **Dominio**: hoy se entra por el portal central. Si se quiere subdominio
  (`amatista.nexusprord.com`) o dominio propio (`amatistadental.com`), configurar DNS.
- **Precios** de los tratamientos y datos del negocio (dirección, teléfono, RNC).
- **Usuarios** adicionales (dentistas, recepción) cuando la dueña los facilite.
