@echo off
:: DeluXe Beauty Center - Configura la impresion directa de QZ Tray.
:: Deja el certificado de confianza en QZ Tray para que imprima SIN cuadros.
:: Pide permiso de administrador automaticamente.

net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)
chcp 65001 >nul
title DeluXe - Configurar impresion directa

set "QZ=%ProgramFiles%\QZ Tray"
if not exist "%QZ%\" set "QZ=%ProgramFiles(x86)%\QZ Tray"
if not exist "%QZ%\" (
  echo.
  echo   No se encontro QZ Tray instalado.
  echo   1^) Instala QZ Tray primero (boton "Descargar QZ Tray" en la app).
  echo   2^) Vuelve a abrir este archivo.
  echo.
  pause
  exit /b
)

echo.
echo   Configurando el certificado de confianza...

:: 1) Dejar el certificado publico en la carpeta de QZ Tray
(
echo -----BEGIN CERTIFICATE-----
echo MIIDdzCCAl+gAwIBAgIUMNCbe8MyfqGe7TUKN1NDW4XFQeMwDQYJKoZIhvcNAQEN
echo BQAwSzEdMBsGA1UEAwwURGVsdVhlIEJlYXV0eSBDZW50ZXIxHTAbBgNVBAoMFERl
echo bHVYZSBCZWF1dHkgQ2VudGVyMQswCQYDVQQGEwJETzAeFw0yNjA2MjcxNTIyMDNa
echo Fw0zNjA2MjQxNTIyMDNaMEsxHTAbBgNVBAMMFERlbHVYZSBCZWF1dHkgQ2VudGVy
echo MR0wGwYDVQQKDBREZWx1WGUgQmVhdXR5IENlbnRlcjELMAkGA1UEBhMCRE8wggEi
echo MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCWhXEl5m6ZFGP6SwiYLoG6uSRt
echo Iw+UpR31OxbV9GOmuZUxx9vUwpe7icLJ0uCdBYBvtbHuYILzKAmc3i5WzLEjdvCY
echo EpRbujeALkdfIAErSwjp+3IVF94IWeNRMga0iwyEGCj1PPNZic7bFN0YgPLBUKSl
echo D99HKoHglAaRMpWGr29ZMgN7N72i3Bu/K5CdLLrNOVbHS+z6BzADUYyaknWYVeap
echo 2BOf9r0me3Z340dK42vFvuwQJtQm/TiYdfOQCjPlT6dMKOOuwro+LYiQ7PpTKnGv
echo 3ktA2JUseFgaOsljmuRwP1cnHoggdlS5jLGemhWMRuUcb/g+PAYbwcjcnZLVAgMB
echo AAGjUzBRMB0GA1UdDgQWBBSQwKgRuud73etaQef+JMiH/aUvEjAfBgNVHSMEGDAW
echo gBSQwKgRuud73etaQef+JMiH/aUvEjAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
echo DQEBDQUAA4IBAQB08pswNHWpWPWZ1dQI8TaGEz2tGo77U/L+2QaWOpNGP850YulS
echo +L0OzbS0ScLrHPUhC9QtCluOgB1AGLy3fOnfrwsXE3Lv1fTWjheA25QaGP2wXyUR
echo ev1M8ALfsGNP61CIxWf0ekx7DnGgXeLPHVhGjVtmYsfpyYqIADx7hSut4RIuWPjm
echo LYVqNLpaWrD7Von6544RoGilBWg1j+CEV+IR2PNVpmT+6oZw8hqIw/aRqDj6tm2P
echo Y4P+ZHfFms9wsReD1tgKRD/+KpH/gS5/ZHEvXntlxyQeZI6Be+sRkk1apdi+Kxgv
echo mRE8AaX1E4PXADswB/oTpBm1YofoJoroKQ9H
echo -----END CERTIFICATE-----
) > "%QZ%\override.crt"
echo   Certificado puesto en: "%QZ%\override.crt"

:: 2) Registrar el certificado en la configuracion de QZ Tray (authcert.override).
::    Esto es lo que hace que QZ confie y NO muestre el cuadro.
set "CRT=%QZ%\override.crt"
powershell -NoProfile -Command ^
  "$prop = Join-Path $env:ProgramFiles 'QZ Tray\qz-tray.properties';" ^
  "if (-not (Test-Path $prop)) { $prop = Join-Path ${env:ProgramFiles(x86)} 'QZ Tray\qz-tray.properties' }" ^
  "$crt = '%CRT%' -replace '\\','/';" ^
  "$lines = @(); if (Test-Path $prop) { $lines = Get-Content $prop | Where-Object { $_ -notmatch '^\s*authcert\.override' } }" ^
  "$lines += 'authcert.override=' + $crt;" ^
  "Set-Content -Path $prop -Value $lines -Encoding ASCII;" ^
  "Write-Host ('   Configuracion actualizada: ' + $prop)"

echo   Reiniciando QZ Tray...
taskkill /im "QZ Tray.exe" /f >nul 2>&1
timeout /t 2 >nul
start "" "%QZ%\QZ Tray.exe"

echo.
echo   ============================================
echo     LISTO. Impresion directa configurada.
echo   ============================================
echo.
echo   Vuelve a la app: Configuracion ^> Impresora ^>
echo   "Probar impresion directa".
echo   (Si quedaba un cuadro abierto, cierralo antes.)
echo.
pause
