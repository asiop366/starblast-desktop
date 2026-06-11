/**
 * Build mod bundle + manifest.json for remote auto-update.
 *
 * Usage:
 *   npm run publish:mods
 *   SB_GITHUB_REPO=youruser/starblast-mods npm run publish:mods
 *
 * Push releases/ + mods-manifest.json to GitHub, then set manifestUrl in update-config.json.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

const repo = process.env.SB_GITHUB_REPO || '';
const version = process.env.SB_MODS_VERSION || (pkg.version + '-' + Date.now());

execSync('node scripts/build-mods-bundle.js', { cwd: ROOT, stdio: 'inherit' });

const bundleSrc = path.join(ROOT, 'dist', 'sb-desktop-mods.bundle.js');
const bundle = fs.readFileSync(bundleSrc);
const sha256 = crypto.createHash('sha256').update(bundle).digest('hex');

const releaseDir = path.join(ROOT, 'releases', version);
fs.mkdirSync(releaseDir, { recursive: true });
const bundleName = 'sb-desktop-mods.bundle.js';
fs.writeFileSync(path.join(releaseDir, bundleName), bundle);

const launcherBundleSrc = path.join(ROOT, 'dist', 'sb-desktop-mods.launcher.bundle.js');
let launcherSha256;
if (fs.existsSync(launcherBundleSrc)) {
  const launcherBundle = fs.readFileSync(launcherBundleSrc);
  launcherSha256 = crypto.createHash('sha256').update(launcherBundle).digest('hex');
  fs.writeFileSync(path.join(releaseDir, 'sb-desktop-mods.launcher.bundle.js'), launcherBundle);
}

function rawUrl(filePath) {
  if (!repo) return null;
  const branch = process.env.SB_GITHUB_BRANCH || 'main';
  return 'https://raw.githubusercontent.com/' + repo + '/' + branch + '/' + filePath.replace(/\\/g, '/');
}

const manifest = {
  version: version,
  updatedAt: new Date().toISOString(),
  bundleUrl: rawUrl('releases/' + version + '/' + bundleName),
  bundleSha256: sha256
};

if (launcherSha256) {
  manifest.launcherBundleUrl = rawUrl('releases/' + version + '/sb-desktop-mods.launcher.bundle.js');
  manifest.launcherBundleSha256 = launcherSha256;
}

const manifestPath = path.join(ROOT, 'mods-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log('');
console.log('Published mod release v' + version);
console.log('  Bundle: releases/' + version + '/' + bundleName);
console.log('  SHA256: ' + sha256);
console.log('  Manifest: mods-manifest.json');
if (manifest.bundleUrl) {
  console.log('');
  console.log('Remote URLs (after git push):');
  console.log('  ' + rawUrl('mods-manifest.json'));
  console.log('  ' + manifest.bundleUrl);
} else {
  console.log('');
  console.log('Set SB_GITHUB_REPO=user/repo to generate raw GitHub URLs.');
  console.log('Upload releases/' + version + '/ + mods-manifest.json to any HTTPS host.');
}
