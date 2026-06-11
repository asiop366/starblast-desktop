/**
 * Bundle starblast.io client files locally. Mods are injected at runtime (see main.js).
 * Run before packaging: npm run bundle
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(
      url,
      { headers: { 'User-Agent': 'StarblastDesktop/1.0' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    ).on('error', reject);
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function downloadFile(url, dest) {
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, await fetchUrl(url));
}

async function main() {
  console.log('Bundling Starblast Desktop client...');

  ensureDir(path.join(CLIENT, 'vendor'));
  ensureDir(path.join(CLIENT, 'static/js'));
  ensureDir(path.join(CLIENT, 'static/img'));

  const vendors = [
    ['https://starblast.io/', path.join(CLIENT, 'index.raw.html')],
    ['https://cdnjs.cloudflare.com/ajax/libs/three.js/85/three.min.js', path.join(CLIENT, 'vendor/three.min.js')],
    ['https://cdnjs.cloudflare.com/ajax/libs/webfont/1.6.27/webfontloader.js', path.join(CLIENT, 'vendor/webfontloader.js')],
    ['https://starblast.io/static/js/atcb.min.js', path.join(CLIENT, 'static/js/atcb.min.js')],
    ['https://starblast.io/static/img/icon64.png', path.join(CLIENT, 'static/img/icon64.png')],
    ['https://starblast.io/static/img/starblast.png', path.join(CLIENT, 'static/img/starblast.png')],
    ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css', path.join(CLIENT, 'vendor/font-awesome.min.css')]
  ];

  for (const [url, dest] of vendors) {
    process.stdout.write('  ' + path.relative(CLIENT, dest) + '\n');
    await downloadFile(url, dest);
  }

  let html = fs.readFileSync(path.join(CLIENT, 'index.raw.html'), 'utf8');

  html = html.replace(/<title>[^<]*<\/title>/i, '<title>Starblast Desktop</title>');
  html = html.replace(/<script[^>]*googletagmanager[^>]*>\s*<\/script>/gi, '');
  html = html.replace(/<script async src="https:\/\/www\.googletagmanager[^"]*"><\/script>/gi, '');
  html = html.replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/blockadblock[^"]*"><\/script>/gi, '');

  html = html.replace(
    /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/85\/three\.min\.js/g,
    'vendor/three.min.js'
  );
  html = html.replace(
    /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/webfont\/1\.6\.27\/webfontloader\.js/g,
    'vendor/webfontloader.js'
  );
  html = html.replace(
    /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/4\.7\.0\/css\/font-awesome\.min\.css/g,
    'vendor/font-awesome.min.css'
  );
  html = html.replace(/https:\/\/starblast\.io\/static\/js\/atcb\.min\.js/g, 'static/js/atcb.min.js');
  html = html.replace(/https:\/\/starblast\.io\/static\/img\//g, 'static/img/');
  html = html.replace(/starblast\.png\?2/g, 'starblast.png');

  const bootstrap =
    '<script>window.__SB_DESKTOP_CLIENT=true;window.__SB_DESKTOP_OFFLINE_SHELL=true;</script>\n' +
    '<!--__SB_DESKTOP_MODS__-->\n';

  if (html.includes('<body>')) {
    html = html.replace('<body>', '<body>\n' + bootstrap);
  } else {
    html = bootstrap + html;
  }

  fs.writeFileSync(path.join(CLIENT, 'index.html'), html);
  fs.unlinkSync(path.join(CLIENT, 'index.raw.html'));

  const sizeMb = (fs.statSync(path.join(CLIENT, 'index.html')).size / (1024 * 1024)).toFixed(2);
  console.log('Done — client/index.html (' + sizeMb + ' MB). Mods injected at runtime.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
