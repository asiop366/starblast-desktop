/**
 * Patch an installed Starblast Launcher (personal use only) to load desktop visual mods.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  resolveLauncherInstall,
  saveLauncherPath
} = require('./find-launcher-install.js');

const ROOT = path.join(__dirname, '..');
const MARKER = '/* sb-desktop-mods-inject */';

function buildBundle(rootDir) {
  execSync('node scripts/build-mods-bundle.js --launcher', { cwd: rootDir, stdio: 'inherit' });
  return fs.readFileSync(path.join(rootDir, 'dist', 'sb-desktop-mods.launcher.bundle.js'), 'utf8');
}

function escapeForTemplate(code) {
  return code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function makeInjectorFunction(bundle) {
  return `
${MARKER}
function sbDesktopInjectModsIntoPage(html) {
  var tag = '<script>\\n' + \`${escapeForTemplate(bundle)}\` + '\\n<\\/script>\\n';
  if (html.indexOf('<body>') >= 0) return html.replace('<body>', '<body>' + tag);
  if (html.indexOf('<body ') >= 0) return html.replace(/<body\\s/, tag + '<body ');
  return tag + html;
}
`;
}

function patchSteamJs(steamPath, bundle) {
  let src = fs.readFileSync(steamPath, 'utf8');
  if (src.includes(MARKER)) {
    const start = src.indexOf(MARKER);
    const fnStart = src.indexOf('function sbDesktopInjectModsIntoPage', start);
    const fnEnd = src.indexOf('\n}\n', fnStart);
    if (fnStart >= 0 && fnEnd >= 0) {
      src = src.slice(0, start) + src.slice(fnEnd + 3);
    }
  }

  const injector = makeInjectorFunction(bundle);
  const bridgeEnd = src.indexOf('waitForWindow();');
  if (bridgeEnd < 0) throw new Error('Could not find waitForWindow() in steam.js');
  src = src.slice(0, bridgeEnd) + injector + '\n' + src.slice(bridgeEnd);

  const writePattern = /document\.write\(src\);\s*\n\s*document\.close\(\);/g;
  if (!writePattern.test(src)) throw new Error('Could not find document.write(src) hooks');
  src = src.replace(
    writePattern,
    'src = sbDesktopInjectModsIntoPage(src);\n            document.write(src);\n            document.close();'
  );

  fs.writeFileSync(steamPath, src);
}

function findResourcesDir(input) {
  const p = path.resolve(input);
  if (fs.existsSync(path.join(p, 'app.asar'))) return p;
  if (fs.existsSync(path.join(p, 'resources', 'app.asar'))) return path.join(p, 'resources');
  if (fs.existsSync(path.join(p, 'steam.js'))) return p;
  throw new Error('Launcher resources not found at: ' + p);
}

function extractAsar(asarPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  execSync('npx --yes @electron/asar extract ' + JSON.stringify(asarPath) + ' ' + JSON.stringify(outDir), {
    stdio: 'inherit'
  });
}

function packAsar(srcDir, asarPath) {
  execSync('npx --yes @electron/asar pack ' + JSON.stringify(srcDir) + ' ' + JSON.stringify(asarPath), {
    stdio: 'inherit'
  });
}

function loadBundle(rootDir, useDownloaded) {
  const existing = path.join(rootDir, 'dist', 'sb-desktop-mods.launcher.bundle.js');
  if (useDownloaded && fs.existsSync(existing)) {
    console.log('Using downloaded mods bundle...');
    return fs.readFileSync(existing, 'utf8');
  }
  console.log('Building mods bundle...');
  return buildBundle(rootDir);
}

function patchLauncher(input, options) {
  options = options || {};
  const rootDir = options.rootDir || ROOT;
  const installDir = resolveLauncherInstall(input || '', rootDir);
  const resources = findResourcesDir(installDir);
  const asarPath = path.join(resources, 'app.asar');
  const steamPath = path.join(resources, 'steam.js');
  const tmpDir = path.join(rootDir, '.launcher-patch-tmp');

  console.log('Launcher: ' + installDir);
  const bundle = loadBundle(rootDir, !!options.useDownloadedBundle);

  if (fs.existsSync(asarPath)) {
    console.log('Extracting app.asar...');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    extractAsar(asarPath, tmpDir);
    patchSteamJs(path.join(tmpDir, 'steam.js'), bundle);
    console.log('Repacking app.asar...');
    fs.copyFileSync(asarPath, asarPath + '.bak');
    packAsar(tmpDir, asarPath);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('Patched: ' + asarPath);
    console.log('Backup:  ' + asarPath + '.bak');
  } else if (fs.existsSync(steamPath)) {
    patchSteamJs(steamPath, bundle);
    console.log('Patched: ' + steamPath);
  } else {
    throw new Error('No app.asar or steam.js in ' + resources);
  }

  saveLauncherPath(rootDir, installDir);
  console.log('\nDone. Restart Starblast Launcher.');
}

function main() {
  const args = process.argv.slice(2).filter(function (a) { return !a.startsWith('--'); });
  const useDownloaded = process.argv.indexOf('--use-downloaded-bundle') >= 0;
  try {
    patchLauncher(args[0] || '', { useDownloadedBundle: useDownloaded, rootDir: ROOT });
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
  console.log('Note: personal use only — do not redistribute the patched launcher (license).');
}

module.exports = { patchLauncher };

if (require.main === module) {
  main();
}
