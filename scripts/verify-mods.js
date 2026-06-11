/**
 * Verify downloaded launcher mod bundle (run from patch-launcher folder).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const bundlePath = path.join(ROOT, 'dist', 'sb-desktop-mods.launcher.bundle.js');

if (!fs.existsSync(bundlePath)) {
  console.log('');
  console.log('ERREUR: bundle introuvable.');
  console.log('  ' + bundlePath);
  console.log('');
  console.log('Lance UPDATE-LAUNCHER.bat (ou PATCH-LAUNCHER.bat la premiere fois).');
  process.exit(1);
}

const bundle = fs.readFileSync(bundlePath, 'utf8');
const versionMatch = bundle.match(/__SB_DESKTOP_MODS_VERSION\s*=\s*["']([^"']+)["']/);

console.log('');
console.log('Version bundle local :', versionMatch ? versionMatch[1] : 'inconnue');
console.log('Couleurs vaisseau     :', bundle.indexOf('sb-ship-color-bar') >= 0 ? 'OK' : 'MANQUANT');
console.log('Save parametres       :', bundle.indexOf('hookSettingsPersistence') >= 0 ? 'OK' : 'MANQUANT');
console.log('Leaderboard neon      :', bundle.indexOf('drawLeaderboardNeonName') >= 0 ? 'OK' : 'MANQUANT');
console.log('Taille                :', (bundle.length / 1024).toFixed(1), 'KB');
console.log('');

if (!versionMatch) {
  process.exit(1);
}
