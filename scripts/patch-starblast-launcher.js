/**
 * Patch an installed Starblast Launcher (personal use only) to load desktop visual mods.
 *
 * Usage (on Windows, after installing Starblast Launcher):
 *   node scripts/patch-starblast-launcher.js "C:\Users\YOU\AppData\Local\Programs\starblast-launcher"
 *
 * Or from this repo on Linux to patch an extracted copy:
 *   node scripts/patch-starblast-launcher.js /path/to/launcher/resources
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MARKER = '/* sb-desktop-mods-inject */';

function buildBundle() {
  execSync('node scripts/build-mods-bundle.js --launcher', { cwd: ROOT, stdio: 'inherit' });
  return fs.readFileSync(path.join(ROOT, 'dist', 'sb-desktop-mods.launcher.bundle.js'), 'utf8');
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

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node scripts/patch-starblast-launcher.js <launcher-install-or-resources-dir>');
    process.exit(1);
  }

  const resources = findResourcesDir(input);
  const asarPath = path.join(resources, 'app.asar');
  const steamPath = path.join(resources, 'steam.js');
  const tmpDir = path.join(ROOT, '.launcher-patch-tmp');

  console.log('Building mods bundle...');
  const bundle = buildBundle();

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

  console.log('\nDone. Restart Starblast Launcher.');
  console.log('Note: personal use only — do not redistribute the patched launcher (license).');
}

main();
