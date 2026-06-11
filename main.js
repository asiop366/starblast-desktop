const { app, BrowserWindow, shell, session, protocol, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { syncMods, buildInjectHtml, loadUpdateConfig } = require('./scripts/mod-sync.js');

const CLIENT_ROOT = path.join(__dirname, 'client');
const BUNDLED_INJECT = path.join(__dirname, 'inject');
const CLIENT_URL = 'sbclient://app/index.html';

let injectHtmlCache = '';
let activeModsDir = BUNDLED_INJECT;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'sbclient',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
      stream: true
    }
  }
]);

function injectModsIntoHtml(html) {
  const marker = '<!--__SB_DESKTOP_MODS__-->';
  if (html.includes(marker)) {
    return html.replace(marker, injectHtmlCache);
  }

  const bootstrap =
    '<script>window.__SB_DESKTOP_CLIENT=true;window.__SB_DESKTOP_OFFLINE_SHELL=true;</script>';
  if (html.includes(bootstrap) && injectHtmlCache) {
    return html.replace(bootstrap, bootstrap + '\n' + injectHtmlCache);
  }

  if (html.includes('<body>')) {
    return html.replace('<body>', '<body>\n' + injectHtmlCache + '\n');
  }
  return injectHtmlCache + '\n' + html;
}

function setupProtocol() {
  protocol.handle('sbclient', (request) => {
    try {
      const url = new URL(request.url);
      const host = url.hostname || 'app';

      if (host === 'mods') {
        let pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
        const filePath = path.normalize(path.join(activeModsDir, pathname));
        if (!filePath.startsWith(activeModsDir)) {
          return new Response('Forbidden', { status: 403 });
        }
        if (!fs.existsSync(filePath)) {
          return new Response('Not found', { status: 404 });
        }
        return net.fetch(pathToFileURL(filePath).href);
      }

      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/' || pathname === '') pathname = '/index.html';
      const relative = pathname.replace(/^\/+/, '');
      const filePath = path.normalize(path.join(CLIENT_ROOT, relative));
      if (!filePath.startsWith(CLIENT_ROOT)) {
        return new Response('Forbidden', { status: 403 });
      }

      if (relative === 'index.html') {
        const html = injectModsIntoHtml(fs.readFileSync(filePath, 'utf8'));
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      return net.fetch(pathToFileURL(filePath).href);
    } catch (err) {
      return new Response('Not found', { status: 404 });
    }
  });
}

function setupSession() {
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['*://starblast.io/*'] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      delete headers['content-security-policy'];
      delete headers['Content-Security-Policy'];
      delete headers['content-security-policy-report-only'];
      delete headers['Content-Security-Policy-Report-Only'];
      callback({ responseHeaders: headers });
    }
  );
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Starblast Desktop',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  win.loadURL(CLIENT_URL);

  win.on('resize', () => {
    win.webContents.executeJavaScript(
      'window.dispatchEvent(new Event("resize"));',
      true
    ).catch(() => {});
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

async function prepareMods() {
  const config = loadUpdateConfig(__dirname);
  const manifestUrl =
    process.env.SB_MODS_MANIFEST_URL ||
    config.manifestUrl ||
    '';

  try {
    const result = await syncMods({
      rootDir: __dirname,
      userDataDir: app.getPath('userData'),
      manifestUrl: manifestUrl,
      onProgress: function (msg) {
        console.log('[mods]', msg);
      }
    });
    activeModsDir = result.modsDir;
    console.log(
      '[mods] Active v' + result.version + ' (' + result.source + ')' +
      (result.updated ? ' — updated' : '')
    );
  } catch (err) {
    console.error('[mods] Sync failed, using bundled inject:', err.message);
    activeModsDir = BUNDLED_INJECT;
  }

  injectHtmlCache = buildInjectHtml(activeModsDir, BUNDLED_INJECT);
}

app.whenReady().then(async () => {
  setupProtocol();
  setupSession();
  await prepareMods();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
