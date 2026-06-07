# Respaldo del sistema anterior (Seguro de Salud)

Este directorio contiene un respaldo **completo** de los datos que existían en el
proyecto de Supabase antes de reutilizarlo para **DELUXE BEAUTY CENTER**.

- **Proyecto Supabase de origen:** `mrtqkhachhvsczltwakt`
- **Fecha del respaldo:** 2026-06-07
- **Esquema respaldado:** `public`

## Contenido

| Archivo | Descripción |
|---|---|
| `seguro-salud-schema.sql` | Definición (DDL) de las 33 tablas: columnas, tipos, defaults y llaves primarias. |
| `seguro-salud-data-backup.json` | Todos los datos: 33 tablas, **2.270 filas** en total. Un objeto JSON por tabla (`{ "tabla": [ {fila}, ... ] }`). |

## Resumen de filas respaldadas

clientes: 106 · facturas: 103 · abonos: 69 · asientos: 198 · auditoria: 1490 ·
pagos: 1 · empresas: 3 · agentes: 2 · secuencias_ncf: 3 · usuarios_sistema: 3 ·
configuracion: 28 · roles: 5 · permissions: 37 · role_permissions: 59 ·
ars_catalog: 11 · bancos: 8 · entregas_admin: 32 · mis_cuentas_bancarias: 3 ·
auto_jobs_log: 49 · auto_notificaciones_log: 37 · smart_historial: 18 ·
system_settings: 2 · transferencias_agentes: 1 · egresos: 1 ·
reporte_destinatarios: 1 · (y tablas vacías: comisiones, changelog,
configuration_history, documentos_clientes, automation_settings,
email_settings, user_permissions, user_theme_preferences)

## Cómo restaurar (si fuera necesario)

1. Crear las tablas ejecutando `seguro-salud-schema.sql` en el proyecto destino.
2. Insertar los datos a partir de `seguro-salud-data-backup.json` (por ejemplo,
   con un script que recorra cada tabla y haga `INSERT`/`upsert`).

> ⚠️ Este respaldo se generó porque el proyecto de Supabase se reutilizó para el
> nuevo sistema del salón. No borres esta carpeta si aún podrías necesitar los
> datos del seguro de salud.
