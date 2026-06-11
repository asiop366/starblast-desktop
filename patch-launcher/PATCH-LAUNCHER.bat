@echo off
setlocal EnableExtensions
title Starblast Desktop patch Launcher

cd /d "%~dp0"

call :FindNode
if errorlevel 1 goto NoNode

echo.
echo ============================================
echo  Patch Starblast Launcher - mods visuels
echo ============================================
echo.

echo [1/3] Preparation du bundle...
"%NODE%" scripts\build-mods-bundle.js --launcher
if errorlevel 1 goto Fail

set "LAUNCHER="

if exist "%LOCALAPPDATA%\Programs\Starblast Launcher\resources\app.asar" (
  set "LAUNCHER=%LOCALAPPDATA%\Programs\Starblast Launcher"
)
if exist "%LOCALAPPDATA%\Programs\starblast-launcher\resources\app.asar" (
  set "LAUNCHER=%LOCALAPPDATA%\Programs\starblast-launcher"
)
if exist "%ProgramFiles%\Starblast Launcher\resources\app.asar" (
  set "LAUNCHER=%ProgramFiles%\Starblast Launcher"
)

if not defined LAUNCHER (
  echo.
  echo Launcher introuvable. Entre le dossier d installation:
  set /p "LAUNCHER=Chemin: "
)

if not exist "%LAUNCHER%\resources\app.asar" (
  echo.
  echo ERREUR: app.asar introuvable ici:
  echo %LAUNCHER%\resources\
  echo Installe Starblast Launcher puis relance.
  pause
  exit /b 1
)

echo [2/3] Launcher: %LAUNCHER%
echo [3/3] Patch en cours...
"%NODE%" scripts\patch-starblast-launcher.js "%LAUNCHER%"
if errorlevel 1 goto Fail

echo.
echo ============================================
echo  OK - Relance Starblast Launcher
echo ============================================
echo Backup: resources\app.asar.bak
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
echo ERREUR: Node.js introuvable.
echo.
echo 1. Installe Node.js LTS: https://nodejs.org/
echo 2. Coche "Add to PATH" a l installation
echo 3. Ferme cette fenetre, redemarre le PC
echo 4. Relance PATCH-LAUNCHER.bat
echo.
echo Test manuel: ouvre cmd et tape: node -v
echo.
pause
exit /b 1

:Fail
echo.
echo ERREUR: patch echoue.
pause
exit /b 1
