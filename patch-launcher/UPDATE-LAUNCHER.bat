@echo off
setlocal EnableExtensions
title Starblast Desktop - update mods from server

cd /d "%~dp0"

call :FindNode
if errorlevel 1 goto NoNode

if not exist "update-config.json" (
  echo.
  echo ERREUR: update-config.json manquant.
  echo Copie update-config.example.json vers update-config.json
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Mise a jour mods Starblast Launcher
echo ============================================
echo.

echo [1/2] Mise a jour des scripts patcher...
set "SCRIPTS_BASE=https://raw.githubusercontent.com/asiop366/starblast-desktop/main/patch-launcher/scripts"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$b='%SCRIPTS_BASE%'; $files=@('mod-sync.js','find-launcher-install.js','patch-starblast-launcher.js','update-launcher-mods.js','verify-mods.js','verify-launcher-patch.js','build-mods-bundle.js'); foreach($f in $files){ try { Invoke-WebRequest -Uri ($b+'/'+$f) -OutFile (Join-Path 'scripts' $f) -UseBasicParsing; Write-Host ('  OK '+$f) } catch { Write-Host ('  WARN '+$f+' (copie locale)') } }"
if errorlevel 1 (
  echo WARN: telechargement scripts echoue, utilisation des fichiers locaux.
)

echo [2/2] Telechargement mods + patch...
"%NODE%" scripts\update-launcher-mods.js
if errorlevel 1 goto Fail

echo.
echo ============================================
echo  OK - Relance Starblast Launcher
echo ============================================
echo.
pause
exit /b 0

:FindNode
set "NODE="
where node >nul 2>&1
if not errorlevel 1 (
  set "NODE=node"
  goto :eof
)
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE=%ProgramFiles%\nodejs\node.exe"
  goto :eof
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
  goto :eof
)
if exist "%LocalAppData%\Programs\node\node.exe" (
  set "NODE=%LocalAppData%\Programs\node\node.exe"
  goto :eof
)
exit /b 1

:NoNode
echo.
echo ERREUR: Node.js introuvable. Installe https://nodejs.org/
pause
exit /b 1

:Fail
echo.
echo ERREUR: mise a jour echouee.
echo.
echo Si c est la premiere fois: lance PATCH-LAUNCHER.bat d abord.
echo.
pause
exit /b 1
