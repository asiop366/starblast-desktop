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
echo.

"%NODE%" -e "const fs=require('fs');const p='dist/sb-desktop-mods.launcher.bundle.js';if(!fs.existsSync(p)){console.log('ERREUR: pas de bundle local. Lance UPDATE-LAUNCHER.bat');process.exit(1)}const b=fs.readFileSync(p,'utf8');const m=b.match(/__SB_DESKTOP_MODS_VERSION = \"([^\"]+)\"/);console.log('Version bundle local:',m?m[1]:'inconnue');console.log('Couleurs vaisseau:',b.indexOf('sb-ship-color-bar')>=0?'OK':'MANQUANT');console.log('Save parametres:',b.indexOf('hookSettingsPersistence')>=0?'OK':'MANQUANT');console.log('Taille:',(b.length/1024).toFixed(1),'KB');"
if errorlevel 1 goto Fail

echo.
echo Dans le jeu (F12 console navigateur):
echo   window.__SB_DESKTOP_MODS_VERSION
echo doit afficher la version ci-dessus.
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
exit /b 1

:NoNode
echo Node.js requis.
pause
exit /b 1

:Fail
pause
exit /b 1
