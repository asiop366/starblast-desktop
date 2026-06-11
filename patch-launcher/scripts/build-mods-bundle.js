/**
 * Concatenate desktop visual mods into one bundle for launcher patching.
 * Usage: node scripts/build-mods-bundle.js [--launcher]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const launcherMode = process.argv.indexOf('--launcher') >= 0;

function resolveModsVersion(root) {
  if (process.env.SB_MODS_VERSION) return process.env.SB_MODS_VERSION;
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  }
  const versionPath = path.join(root, 'mods-version.txt');
  if (fs.existsSync(versionPath)) {
    return fs.readFileSync(versionPath, 'utf8').trim();
  }
  return '0.0.0';
}

const modsVersion = resolveModsVersion(ROOT);
const OUT = path.join(
  ROOT,
  'dist',
  launcherMode ? 'sb-desktop-mods.launcher.bundle.js' : 'sb-desktop-mods.bundle.js'
);

var FILES;
if (launcherMode) {
  // display-fix breaks Starblast Launcher lobby (giant carbon UI).
  // settings-ui is handled by the launcher already.
  FILES = [
    'inject/launcher-settings.js',
    'inject/ship-colors.js',
    'inject/visual-patch.js'
  ];
} else {
  FILES = [
    'inject/display-fix.js',
    'inject/settings-ui.js',
    'inject/ship-colors.js',
    'inject/visual-patch.js'
  ];
}

const parts = FILES.map(function (rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
});

const banner =
  '/* Starblast Desktop visual mods' + (launcherMode ? ' — launcher' : '') + ' v' + modsVersion + ' */\n' +
  'window.__SB_DESKTOP_MODS_VERSION = ' + JSON.stringify(modsVersion) + ';\n' +
  'window.__SB_DESKTOP_CLIENT = true;\n' +
  (launcherMode ? 'window.__SB_DESKTOP_LAUNCHER_PATCH = true;\n' : '');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, banner + parts.join('\n'));
console.log('Wrote ' + OUT + ' (' + (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB)');
