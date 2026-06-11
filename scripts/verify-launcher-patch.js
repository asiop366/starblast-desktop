/**
 * Check whether Starblast Launcher app.asar contains our mod injector.
 */
const fs = require('fs');
const path = require('path');
const { resolveLauncherInstall } = require('./find-launcher-install.js');

const ROOT = path.join(__dirname, '..');
const MARKER = 'sb-desktop-mods-inject';

function findAsar(installDir) {
  const candidates = [
    path.join(installDir, 'resources', 'app.asar'),
    path.join(installDir, 'app.asar')
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) return candidates[i];
  }
  return null;
}

function main() {
  var installDir;
  try {
    installDir = resolveLauncherInstall(process.env.SB_LAUNCHER_DIR || '', ROOT);
  } catch (err) {
    console.log('');
    console.log('Launcher Starblast : INTROUVABLE');
    console.log('  Lance PATCH-LAUNCHER.bat une fois.');
    process.exit(1);
  }

  var asarPath = findAsar(installDir);
  if (!asarPath) {
    console.log('');
    console.log('Launcher trouve mais app.asar manquant :');
    console.log('  ' + installDir);
    process.exit(1);
  }

  var buf = fs.readFileSync(asarPath);
  var patched = buf.indexOf(MARKER) >= 0;
  var backup = fs.existsSync(asarPath + '.bak');

  console.log('');
  console.log('Launcher installe : ' + installDir);
  console.log('app.asar patche   : ' + (patched ? 'OUI' : 'NON'));
  console.log('Backup .bak       : ' + (backup ? 'OUI' : 'non'));
  console.log('');

  if (!patched) {
    console.log('=> Le patch n est PAS applique. Lance PATCH-LAUNCHER.bat ou UPDATE-LAUNCHER.bat.');
    process.exit(1);
  }
}

main();
