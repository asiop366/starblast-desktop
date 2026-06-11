/**
 * Concatenate desktop visual mods into one bundle for launcher patching.
 * Usage: node scripts/build-mods-bundle.js [--launcher]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const launcherMode = process.argv.indexOf('--launcher') >= 0;
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
  '/* Starblast Desktop visual mods' + (launcherMode ? ' — launcher' : '') + ' */\n' +
  'window.__SB_DESKTOP_CLIENT = true;\n' +
  (launcherMode ? 'window.__SB_DESKTOP_LAUNCHER_PATCH = true;\n' : '');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, banner + parts.join('\n'));
console.log('Wrote ' + OUT + ' (' + (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB)');
