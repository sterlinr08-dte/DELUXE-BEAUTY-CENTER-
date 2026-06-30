# CLAUDE.md

Guía para asistentes de IA (Claude Code) que trabajen en este repositorio.
Lee también el `README.md` para la descripción funcional completa.

## Qué es este proyecto

**DELUXE BEAUTY CENTER** — sistema web de gestión para un salón de belleza
(citas, clientes, servicios, empleados, facturación, caja, compras, gastos,
nómina, cuentas por cobrar/pagar y contabilidad).

> Nota de nombres: la carpeta local es `Seguro-de-salud` y el repo histórico se
> llamaba "Seguro de Salud", pero **el proyecto actual es DELUXE BEAUTY CENTER**.
> En GitHub el repositorio se llama **`DELUXE-BEAUTY-CENTER-`**
> (owner `sterlinr08-dte`). El sistema anterior quedó archivado en `backup/`.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 |
| Estilos | Tailwind CSS |
| Iconos | lucide-react |
| Routing | react-router-dom v6 — **HashRouter** (ver gotchas) |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Fechas | date-fns |

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # desarrollo (Vite, puerto 5173)
npm run build      # build de producción (tsc -b && vite build) -> dist/
npm run preview    # previsualizar el build
npm run lint       # chequeo de tipos (tsc --noEmit)
```

No hay framework de tests configurado. La verificación previa al deploy es
`npm run build` (incluye el chequeo de TypeScript).

## Estructura

```
src/
  components/   Reutilizables: Sidebar, Modal, PageHeader, DataTable, Cargando, Paginacion
  lib/          supabase.ts (cliente), auth.tsx (sesión), permisos.ts (RBAC),
                negocio.tsx (ajustes), comisiones.ts, reportes.ts, format.ts, constants.ts,
                impresora.ts (QZ Tray), ticket.ts (recibo térmico)
  pages/        Una página por módulo: Dashboard, Citas, Clientes, Servicios,
                Empleados, Facturacion, Caja, Compras, Gastos, Nomina,
                Contabilidad, CuentasPorCobrar, CuentasPorPagar, Articulos,
                Mobiliario, Reportes, Configuracion, Login
  types.ts      Tipos del dominio
supabase/
  migrations/   Migraciones SQL numeradas (0001..0036). Añade nuevas en orden.
  functions/    Edge functions (gestionar-usuarios, qz-firmar — esta NO está en el
                repo: solo desplegada en Supabase, ver "Impresión directa")
public/
  impresion-directa/   override.crt + configurador .bat + LEEME para QZ Tray
backup/         Sistema anterior (no tocar salvo petición explícita)
```

## Convenciones de código

- **Todo el código y la UI están en español** (nombres de variables, archivos,
  rutas, identificadores y textos). Mantén ese idioma al crear código nuevo.
- Componentes y páginas en React con TypeScript (`.tsx`).
- Estilos con clases de Tailwind; no hay CSS-in-JS.
- Sigue el estilo de los archivos vecinos (naming, densidad de comentarios, idiom).

## Supabase / seguridad

- Auth por **email + contraseña** (Supabase Auth). Sin sesión no se entra ni se
  lee/escribe nada: **todas las tablas tienen RLS** con políticas `to authenticated`.
- La clave que usa el front es la **publishable/anon**, pública por diseño (la
  protege RLS). Está en `.env` (local) y en el workflow de deploy (producción).
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  (ver `.env.example`).
- Para cambios de esquema: revisa primero las migraciones existentes y añade una
  nueva numerada en `supabase/migrations/`.

## Despliegue (IMPORTANTE — leído de experiencia real)

- La app se publica en **GitHub Pages** vía GitHub Actions:
  `.github/workflows/deploy.yml`.
- **Se despliega automáticamente con cada push a `main`** (o manualmente con
  *workflow_dispatch*). El build inyecta las variables `VITE_SUPABASE_*`.
- URL de producción:
  **https://sterlinr08-dte.github.io/DELUXE-BEAUTY-CENTER-/**
  (la dueña la usa en el dominio propio **https://deluxe.nexusprord.com/**).
- Pages → Source = **GitHub Actions** (ya configurado).

### Flujo de deploy real (IMPORTANTE)

- **`git push origin main` está BLOQUEADO** en este entorno. El trabajo se
  desarrolla en la rama `claude/repo-branding-deluxe-beauty-RpxUZ`, se sube ahí,
  y se publica a `main` vía **Pull Request + merge** usando las herramientas MCP
  de GitHub (`create_pull_request` → `merge_pull_request`, método `merge`).
- Tras el merge, GitHub Actions despliega solo (~1–2 min). Verifica con
  `actions_list`/`actions_get` que el run quede en `completed/success`.
- El **repo en GitHub se llama `DELUXE-BEAUTY-CENTER-`** aunque el remoto local
  apunte a `seguro-de-salud` (redirige). El scope MCP es `sterlinr08-dte/seguro-de-salud`.
- Las **migraciones** se aplican a producción con el MCP de Supabase
  (`apply_migration`, proyecto `mrtqkhachhvsczltwakt`) y además se guarda el `.sql`
  numerado en `supabase/migrations/`.

### Gotchas de GitHub Pages (ya resueltos — no re-romper)

1. **El sitio vive en un subdirectorio** (`/DELUXE-BEAUTY-CENTER-/`), por eso:
   - `vite.config.ts` usa `base: './'` (rutas relativas).
   - `src/main.tsx` usa **`HashRouter`** (no `BrowserRouter`), para que el routing
     funcione sin necesidad de un `404.html`. **No cambiar a BrowserRouter** sin
     configurar `basename` + fallback SPA.
2. El entorno **`github-pages`** (Settings → Environments) debe permitir desplegar
   desde `main`. Si el job `deploy` falla **al instante (~1s, sin logs)**, casi
   seguro es la regla *"Deployment branches and tags"* bloqueando `main`
   → ponerla en **"No restriction"** o añadir regla `main`.

## Impresión directa del recibo (QZ Tray)

Los tickets de Facturación y Caja se imprimen **directo a la impresora térmica
(2Connet 2C-POS80-01-V7, 80mm) SIN el cuadro de Windows/Chrome**, vía **QZ Tray**.

- `src/lib/ticket.ts` → `construirTicketFactura(...)`: genera el HTML autónomo del
  recibo (Playfair + mayúsculas, columnas `table-layout:fixed`, números con
  `white-space:nowrap` para que **Cant./Importe nunca se partan**). Lo usan
  Facturación (reimprimir) y Caja (cobrar) para que el recibo se vea idéntico.
- `src/lib/impresora.ts` → `imprimirHTML(html, anchoMm, copias)`: imprime por QZ
  (pixel/HTML) en la impresora predeterminada. Si QZ no está, el llamador cae a
  `window.print()`.
- **Firma de seguridad**: QZ exige firmar cada solicitud. La firma la hace la
  Edge Function **`qz-firmar`** (RSASSA-PKCS1-v1_5 SHA-512). La **llave privada
  vive SOLO en esa función de Supabase** (nunca en el repo ni en el front).
  En `impresora.ts` va el **certificado público** (`CERTIFICADO`), que debe ser
  **pareja exacta** de esa llave; si no coinciden, QZ rechaza la firma ("Untrusted",
  "Remember" en gris) → regenerar el par y desplegar ambos.
- Para que QZ **confíe y no muestre el cuadro**: en cada PC se agrega el
  `override.crt` en **QZ Tray → Advanced → Site Manager → "+"** (método más fácil),
  o con el configurador (`public/impresion-directa/`, deja `override.crt` +
  `authcert.override` en `qz-tray.properties`). El cert se puede descargar de
  `…/impresion-directa/override.crt`.
- **Copias**: el recibo permite elegir cuántas (`config.copies`).

## Otras reglas de negocio ya implementadas

- **Fecha fija = hoy**: en Facturación, Gastos, Compras y Nómina la fecha viene
  bloqueada con la de hoy; solo cambia quien tenga el permiso
  `*.cambiar_fecha` (admin por defecto).
- **Caja → cobro**: guarda `facturas.efectivo_recibido` y `facturas.devuelta`
  (con cuánto pagó y el vuelto) y los muestra en el recibo. Botón
  **"Cobrar e imprimir"** = cobra y manda el ticket directo por QZ.
- **Mobiliario y equipos**: módulo de activos del salón (foto en Storage bucket
  `mobiliario`, código con prefijo `MB`).
- **Prefijos configurables** de todas las secuencias en Configuración → Prefijos.
- **UI en MAYÚSCULAS**: `#root { text-transform: uppercase }` en `index.css`
  (solo visual; los datos se guardan tal cual).

## Reglas de trabajo

- No crees Pull Requests salvo que el usuario lo pida explícitamente (excepción:
  el flujo de deploy de arriba usa PR+merge para llegar a `main`).
- Commits con mensajes claros y descriptivos.
- El usuario (dueña del salón) se comunica en español; responde en español.
