@echo off
setlocal EnableExtensions
title Starblast Desktop - verifier mods installes

cd /d "%~dp0"

call :FindNode
if errorlevel 1 goto NoNode

echo.
echo ============================================
echo  Verification mods Starblast Desktop
echo ============================================

"%NODE%" scripts\verify-mods.js
if errorlevel 1 goto Fail

echo.
echo --- Patch installe dans Starblast Launcher ? ---
"%NODE%" scripts\verify-launcher-patch.js
if errorlevel 1 goto Fail

echo Dans le jeu (F12 console navigateur):
echo   window.__SB_DESKTOP_MODS_VERSION
echo doit afficher la meme version.
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
echo Verification echouee.
echo Lance UPDATE-LAUNCHER.bat puis reessaie.
echo.
pause
exit /b 1
