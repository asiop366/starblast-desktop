/**
 * Remote mod sync for Starblast Desktop.
 * Fetches manifest on startup and caches inject bundle under userData/mods/.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const STANDALONE_ORDER = [
  'display-fix.js',
  'settings-ui.js',
  'ship-colors.js',
  'visual-patch.js'
];

function fetchUrl(url) {
  return new Promise(function (resolve, reject) {
    const mod = url.startsWith('https') ? https : http;
    mod.get(
      url,
      { headers: { 'User-Agent': 'StarblastDesktop/1.0' } },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
          return;
        }
        const chunks = [];
        res.on('data', function (chunk) { chunks.push(chunk); });
        res.on('end', function () { resolve(Buffer.concat(chunks)); });
        res.on('error', reject);
      }
    ).on('error', reject);
  });
}

function loadUpdateConfig(rootDir) {
  const configPath = path.join(rootDir, 'update-config.json');
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.warn('[mods] Invalid update-config.json:', err.message);
    return {};
  }
}

function readBundledInjectHtml(bundledDir) {
  return STANDALONE_ORDER.map(function (file) {
    const src = path.join(bundledDir, file);
    if (!fs.existsSync(src)) return '';
    return '<script>\n' + fs.readFileSync(src, 'utf8') + '\n</script>';
  }).filter(Boolean).join('\n');
}

function buildInjectHtml(modsDir, bundledDir) {
  const bundlePath = path.join(modsDir, 'inject.bundle.js');
  if (fs.existsSync(bundlePath)) {
    return '<script>\n' + fs.readFileSync(bundlePath, 'utf8') + '\n</script>';
  }

  let order = STANDALONE_ORDER;
  const orderPath = path.join(modsDir, 'order.json');
  if (fs.existsSync(orderPath)) {
    try {
      order = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
    } catch (_) {}
  }

  const parts = order.map(function (file) {
    const remote = path.join(modsDir, file);
    const src = fs.existsSync(remote) ? remote : path.join(bundledDir, file);
    if (!fs.existsSync(src)) return '';
    return '<script>\n' + fs.readFileSync(src, 'utf8') + '\n</script>';
  }).filter(Boolean);

  if (parts.length) return parts.join('\n');
  return readBundledInjectHtml(bundledDir);
}

async function syncMods(options) {
  const rootDir = options.rootDir;
  const userDataDir = options.userDataDir;
  const manifestUrl = (options.manifestUrl || '').trim();
  const bundledDir = path.join(rootDir, 'inject');
  const remoteDir = path.join(userDataDir, 'mods');

  if (!manifestUrl) {
    return {
      modsDir: bundledDir,
      version: 'bundled',
      updated: false,
      source: 'bundled'
    };
  }

  const onProgress = options.onProgress || function () {};
  onProgress('Checking for mod updates…');

  const raw = await fetchUrl(manifestUrl);
  const manifest = JSON.parse(raw.toString('utf8'));
  if (!manifest.version) {
    throw new Error('Manifest missing version');
  }

  const versionFile = path.join(remoteDir, 'version.txt');
  const localVersion = fs.existsSync(versionFile)
    ? fs.readFileSync(versionFile, 'utf8').trim()
    : '';

  const hasBundle = fs.existsSync(path.join(remoteDir, 'inject.bundle.js'));
  const hasFiles = STANDALONE_ORDER.some(function (file) {
    return fs.existsSync(path.join(remoteDir, file));
  });

  if (localVersion === String(manifest.version) && (hasBundle || hasFiles)) {
    return {
      modsDir: remoteDir,
      version: manifest.version,
      updated: false,
      source: 'cache'
    };
  }

  onProgress('Downloading mods v' + manifest.version + '…');
  fs.mkdirSync(remoteDir, { recursive: true });

  if (manifest.bundleUrl) {
    const bundle = await fetchUrl(manifest.bundleUrl);
    if (manifest.bundleSha256) {
      const hash = crypto.createHash('sha256').update(bundle).digest('hex');
      if (hash !== manifest.bundleSha256) {
        throw new Error('Bundle checksum mismatch');
      }
    }
    fs.writeFileSync(path.join(remoteDir, 'inject.bundle.js'), bundle);
  } else if (manifest.files && typeof manifest.files === 'object') {
    const baseUrl = manifest.baseUrl || '';
    for (const [name, info] of Object.entries(manifest.files)) {
      const url = typeof info === 'string' ? info : (info.url || baseUrl + name);
      const data = await fetchUrl(url);
      if (info && info.sha256) {
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        if (hash !== info.sha256) {
          throw new Error('Checksum failed: ' + name);
        }
      }
      fs.writeFileSync(path.join(remoteDir, name), data);
    }
    if (Array.isArray(manifest.order)) {
      fs.writeFileSync(path.join(remoteDir, 'order.json'), JSON.stringify(manifest.order));
    }
  } else {
    throw new Error('Manifest needs bundleUrl or files');
  }

  fs.writeFileSync(versionFile, String(manifest.version));
  onProgress('Mods updated to v' + manifest.version);

  return {
    modsDir: remoteDir,
    version: manifest.version,
    updated: true,
    source: 'remote'
  };
}

module.exports = {
  STANDALONE_ORDER,
  fetchUrl,
  loadUpdateConfig,
  buildInjectHtml,
  syncMods
};
