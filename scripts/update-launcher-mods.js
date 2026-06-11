/**
 * Download latest launcher mod bundle and re-patch Starblast Launcher.
 */
const fs = require('fs');
const path = require('path');
const { fetchUrl, loadUpdateConfig } = require('./mod-sync.js');
const { resolveLauncherInstall } = require('./find-launcher-install.js');
const { patchLauncher } = require('./patch-starblast-launcher.js');

const ROOT = path.join(__dirname, '..');

async function main() {
  const config = loadUpdateConfig(ROOT);
  const manifestUrl =
    process.env.SB_MODS_MANIFEST_URL ||
    config.manifestUrl ||
    '';

  if (!manifestUrl) {
    console.error('Set manifestUrl in update-config.json or SB_MODS_MANIFEST_URL');
    process.exit(1);
  }

  let launcherDir;
  try {
    launcherDir = resolveLauncherInstall(process.env.SB_LAUNCHER_DIR || '', ROOT);
  } catch (err) {
    console.error(err.message || err);
    console.error('');
    console.error('Lance PATCH-LAUNCHER.bat une premiere fois.');
    process.exit(1);
  }

  console.log('Fetching manifest…');
  const manifest = JSON.parse((await fetchUrl(manifestUrl)).toString('utf8'));
  if (!manifest.launcherBundleUrl) {
    console.error('Manifest has no launcherBundleUrl');
    process.exit(1);
  }

  console.log('Downloading launcher mods v' + manifest.version + '…');
  const bundle = await fetchUrl(manifest.launcherBundleUrl);
  const out = path.join(ROOT, 'dist', 'sb-desktop-mods.launcher.bundle.js');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, bundle);

  console.log('Patching Starblast Launcher…');
  patchLauncher(launcherDir, { useDownloadedBundle: true, rootDir: ROOT });
  console.log('Done — relaunch Starblast Launcher.');
}

main().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
