/**
 * Download latest launcher mod bundle and re-patch Starblast Launcher.
 * Falls back to the bundle shipped in patch-launcher/ when GitHub is unreachable
 * (e.g. private repo → raw.githubusercontent.com returns 404).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { fetchUrl, loadUpdateConfig } = require('./mod-sync.js');
const { resolveLauncherInstall } = require('./find-launcher-install.js');
const { patchLauncher } = require('./patch-starblast-launcher.js');

const ROOT = path.join(__dirname, '..');

function readLocalManifest() {
  const localPath = path.join(ROOT, 'mods-manifest.local.json');
  if (fs.existsSync(localPath)) {
    try {
      return JSON.parse(fs.readFileSync(localPath, 'utf8'));
    } catch (err) {
      console.warn('WARN: invalid mods-manifest.local.json —', err.message);
    }
  }

  const versionPath = path.join(ROOT, 'mods-version.txt');
  const bundlePath = path.join(ROOT, 'dist', 'sb-desktop-mods.launcher.bundle.js');
  if (!fs.existsSync(versionPath) || !fs.existsSync(bundlePath)) return null;

  const version = fs.readFileSync(versionPath, 'utf8').trim();
  if (!version) return null;

  const bundleText = fs.readFileSync(bundlePath, 'utf8');
  return {
    version: version,
    offline: true,
    localBundle: bundlePath,
    launcherBundleSha256: crypto.createHash('sha256').update(bundleText).digest('hex')
  };
}

async function fetchRemoteManifest(manifestUrl) {
  const raw = await fetchUrl(manifestUrl);
  return JSON.parse(raw.toString('utf8'));
}

function loadBundleFromManifest(manifest) {
  if (manifest.localBundle) {
    const bundlePath = path.isAbsolute(manifest.localBundle)
      ? manifest.localBundle
      : path.join(ROOT, manifest.localBundle);
    if (!fs.existsSync(bundlePath)) {
      throw new Error('Local bundle missing: ' + bundlePath);
    }
    const bundleText = fs.readFileSync(bundlePath, 'utf8');
    return { bundleText: bundleText, source: 'local zip v' + manifest.version };
  }
  return null;
}

async function downloadBundle(manifest) {
  const local = loadBundleFromManifest(manifest);
  if (local) return local;

  if (!manifest.launcherBundleUrl) {
    throw new Error('Manifest has no launcherBundleUrl and no local bundle');
  }

  const bundleText = (await fetchUrl(manifest.launcherBundleUrl)).toString('utf8');
  return { bundleText: bundleText, source: 'GitHub v' + manifest.version };
}

function verifyBundle(bundleText, manifest) {
  if (bundleText.indexOf('__SB_DESKTOP_MODS_VERSION') < 0) {
    console.warn('WARN: bundle has no version marker (old publish?)');
  } else if (bundleText.indexOf(String(manifest.version)) < 0) {
    console.warn('WARN: bundle may not match manifest v' + manifest.version);
  }
  if (manifest.launcherBundleSha256) {
    const hash = crypto.createHash('sha256').update(bundleText).digest('hex');
    if (hash !== manifest.launcherBundleSha256) {
      throw new Error('Launcher bundle checksum mismatch');
    }
  }
}

async function main() {
  const config = loadUpdateConfig(ROOT);
  const manifestUrl =
    process.env.SB_MODS_MANIFEST_URL ||
    config.manifestUrl ||
    '';

  let launcherDir;
  try {
    launcherDir = resolveLauncherInstall(process.env.SB_LAUNCHER_DIR || '', ROOT);
  } catch (err) {
    console.error(err.message || err);
    console.error('');
    console.error('Lance PATCH-LAUNCHER.bat une premiere fois.');
    process.exit(1);
  }

  let manifest = null;
  let usedOffline = false;

  if (manifestUrl) {
    console.log('Fetching manifest…');
    try {
      manifest = await fetchRemoteManifest(manifestUrl);
      console.log('Remote manifest OK (v' + manifest.version + ')');
    } catch (err) {
      console.warn('Remote manifest unavailable: ' + (err.message || err));
      manifest = readLocalManifest();
      usedOffline = !!manifest;
      if (manifest) {
        console.log('Using offline bundle from zip (v' + manifest.version + ')');
      }
    }
  }

  if (!manifest) {
    manifest = readLocalManifest();
    usedOffline = !!manifest;
    if (manifest) {
      console.log('Using offline bundle from zip (v' + manifest.version + ')');
    }
  }

  if (!manifest) {
    console.error('No manifest available.');
    console.error('Telecharge un zip patch-launcher recent ou rends le depot GitHub public.');
    process.exit(1);
  }

  const downloaded = await downloadBundle(manifest);
  verifyBundle(downloaded.bundleText, manifest);

  const out = path.join(ROOT, 'dist', 'sb-desktop-mods.launcher.bundle.js');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, downloaded.bundleText);
  console.log('Bundle OK — ' + downloaded.source + ' (' + (downloaded.bundleText.length / 1024).toFixed(1) + ' KB)');

  if (usedOffline) {
    console.log('');
    console.log('NOTE: mise a jour GitHub indisponible (depot prive ou reseau).');
    console.log('      Bundle local applique. Pour auto-update en ligne, rends le repo public');
    console.log('      ou envoie un zip patch-launcher plus recent a ton pote.');
  }

  console.log('Patching Starblast Launcher…');
  patchLauncher(launcherDir, { useDownloadedBundle: true, rootDir: ROOT });
  console.log('Done — relaunch Starblast Launcher.');
}

main().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
