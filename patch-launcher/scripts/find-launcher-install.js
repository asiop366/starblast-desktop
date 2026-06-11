/**
 * Locate Starblast Launcher install directory on the local machine.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const SAVED_PATH_FILE = 'launcher-install-path.txt';

function hasLauncherResources(dir) {
  if (!dir) return false;
  return fs.existsSync(path.join(dir, 'resources', 'app.asar')) ||
    fs.existsSync(path.join(dir, 'app.asar')) ||
    fs.existsSync(path.join(dir, 'resources', 'steam.js')) ||
    fs.existsSync(path.join(dir, 'steam.js'));
}

function getSavedLauncherPath(rootDir) {
  const file = path.join(rootDir, SAVED_PATH_FILE);
  if (!fs.existsSync(file)) return null;
  const saved = fs.readFileSync(file, 'utf8').trim();
  if (saved && hasLauncherResources(saved)) return saved;
  return null;
}

function saveLauncherPath(rootDir, installDir) {
  fs.writeFileSync(path.join(rootDir, SAVED_PATH_FILE), installDir.trim() + '\n', 'utf8');
}

function findDefaultLauncherInstall() {
  const candidates = [];

  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    candidates.push(
      path.join(localApp, 'Programs', 'Starblast Launcher'),
      path.join(localApp, 'Programs', 'starblast-launcher'),
      path.join(pf, 'Starblast Launcher'),
      path.join(pf, 'starblast-launcher'),
      path.join(pf86, 'Starblast Launcher'),
      path.join(pf86, 'starblast-launcher')
    );
  }

  for (var i = 0; i < candidates.length; i++) {
    if (hasLauncherResources(candidates[i])) return candidates[i];
  }
  return null;
}

function resolveLauncherInstall(input, rootDir) {
  var trimmed = (input || '').trim();
  if (trimmed && hasLauncherResources(trimmed)) return trimmed;

  var saved = getSavedLauncherPath(rootDir);
  if (saved) return saved;

  var found = findDefaultLauncherInstall();
  if (found) return found;

  throw new Error(
    'Starblast Launcher introuvable.\n' +
    'Relance PATCH-LAUNCHER.bat une fois, ou lance:\n' +
    '  node scripts/patch-starblast-launcher.js "C:\\chemin\\vers\\Starblast Launcher"'
  );
}

module.exports = {
  SAVED_PATH_FILE,
  hasLauncherResources,
  getSavedLauncherPath,
  saveLauncherPath,
  findDefaultLauncherInstall,
  resolveLauncherInstall
};
