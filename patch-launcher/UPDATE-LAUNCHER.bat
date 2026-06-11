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
  echo et mets l URL du manifest mods-manifest.json dedans.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Mise a jour mods Starblast Launcher
echo ============================================
echo.

"%NODE%" scripts\update-launcher-mods.js
if errorlevel 1 goto Fail

echo.
echo OK - Relance Starblast Launcher
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
pause
exit /b 1
