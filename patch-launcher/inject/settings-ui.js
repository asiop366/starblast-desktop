/**
 * Pre-game settings overlay — gem color & desktop mod options.
 */
(function () {
  'use strict';

  if (window.__sbDesktopSettingsUI) return;
  window.__sbDesktopSettingsUI = true;

  if (window.__SB_DESKTOP_LAUNCHER_PATCH) {
    window.__sbDesktopSettings = window.__sbDesktopSettings || {
      gemColor: '#ffffff',
      gemWorldGlow: true,
      gemBarNeon: true,
      shieldColor: '#00ffff',
      shieldBarNeon: true,
      energyColor: '#ff69b4',
      energyBarNeon: true,
      leaderboardNeon: true,
      leaderboardColor: '#ff69b4',
      fovMultiplier: 1.2
    };
    return;
  }

  var STORAGE_KEY = 'sbDesktopSettings';

  var DEFAULTS = {
    gemColor: '#ffffff',
    gemWorldGlow: true,
    gemBarNeon: true,
    shieldColor: '#00ffff',
    shieldBarNeon: true,
    energyColor: '#ff69b4',
    energyBarNeon: true,
    leaderboardNeon: true,
    leaderboardColor: '#ff69b4',
    fovMultiplier: 1.2
  };

  function normalizeSettings(raw) {
    var s = Object.assign({}, DEFAULTS, raw || {});
    if (s.gemBarNeon == null && s.gemGlow != null) s.gemBarNeon = !!s.gemGlow;
    delete s.backgroundImage;
    delete s.backgroundColor;
    delete s.gemGlow;
    return s;
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return normalizeSettings({});
      return normalizeSettings(JSON.parse(raw));
    } catch (e) {
      return normalizeSettings({});
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
    } catch (e) {
      alert('Impossible de sauvegarder les réglages.');
      return false;
    }
    window.__sbDesktopSettings = normalizeSettings(settings);
    window.dispatchEvent(new CustomEvent('sbDesktopSettingsChanged', { detail: window.__sbDesktopSettings }));
    return true;
  }

  window.__sbDesktopSettings = loadSettings();

  try {
    var legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      var parsed = JSON.parse(legacy);
      if (parsed.backgroundColor || parsed.backgroundImage || parsed.gemGlow != null) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(parsed)));
      }
    }
  } catch (e) {
    // ignore
  }

  function chk(id, on) {
    return '<input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '>';
  }

  function colorField(id, label, value) {
    return '<label class="sb-desk-field"><span>' + label + '</span>' +
      '<input type="color" id="' + id + '" value="' + value + '"></label>';
  }

  function checkField(id, label, on) {
    return '<label class="sb-desk-field sb-desk-check">' + chk(id, on) + '<span>' + label + '</span></label>';
  }

  function createOverlay() {
    if (document.getElementById('sb-desktop-settings')) return;

    var settings = loadSettings();

    var root = document.createElement('div');
    root.id = 'sb-desktop-settings';
    root.innerHTML =
      '<div class="sb-desk-backdrop">' +
        '<div class="sb-desk-panel">' +
          '<h2>Starblast Desktop</h2>' +
          '<p class="sb-desk-sub">Réglages visuels avant de jouer</p>' +
          colorField('sb-gem-color', 'Couleur des gemmes', settings.gemColor) +
          checkField('sb-gem-world-glow', 'Glow des gemmes (monde)', settings.gemWorldGlow !== false) +
          checkField('sb-gem-bar-neon', 'Néon barre gemmes', settings.gemBarNeon !== false) +
          colorField('sb-shield-color', 'Couleur barre bouclier', settings.shieldColor) +
          checkField('sb-shield-neon', 'Néon barre bouclier', settings.shieldBarNeon !== false) +
          colorField('sb-energy-color', 'Couleur barre énergie', settings.energyColor) +
          checkField('sb-energy-neon', 'Néon barre énergie', settings.energyBarNeon !== false) +
          checkField('sb-lb-neon', 'Galaxie + néon sur ton pseudo (TAB)', settings.leaderboardNeon !== false) +
          colorField('sb-lb-color', 'Couleur néon pseudo (leaderboard)', settings.leaderboardColor) +
          '<p class="sb-desk-hint">Molette souris en jeu : zoom FOV + / −</p>' +
          '<div class="sb-desk-actions">' +
            '<button type="button" id="sb-desk-apply">Appliquer et jouer</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#sb-desktop-settings{position:fixed;inset:0;z-index:2147483646;font-family:Segoe UI,system-ui,sans-serif}' +
      '#sb-desktop-settings .sb-desk-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center}' +
      '#sb-desktop-settings .sb-desk-panel{width:min(420px,92vw);max-height:90vh;overflow:auto;background:#0a0a0a;border:2px solid #00ffff;border-radius:12px;padding:24px;color:#fff;box-shadow:0 0 24px rgba(0,255,255,.35)}' +
      '#sb-desktop-settings h2{margin:0 0 4px;font-size:22px;color:#00ffff;text-shadow:0 0 8px rgba(0,255,255,.8)}' +
      '#sb-desktop-settings .sb-desk-sub{margin:0 0 18px;opacity:.75;font-size:13px}' +
      '#sb-desktop-settings .sb-desk-field{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0;font-size:14px}' +
      '#sb-desktop-settings .sb-desk-check{justify-content:flex-start;flex-wrap:wrap}' +
      '#sb-desktop-settings input[type=color]{width:56px;height:36px;border:1px solid #444;background:#111;cursor:pointer}' +
      '#sb-desktop-settings .sb-desk-hint{margin:8px 0 0;font-size:12px;opacity:.6}' +
      '#sb-desktop-settings .sb-desk-actions{margin-top:20px;display:flex;justify-content:flex-end}' +
      '#sb-desktop-settings #sb-desk-apply{background:linear-gradient(180deg,#00ffff,#00aacc);color:#000;border:none;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer;box-shadow:0 0 12px rgba(0,255,255,.5)}' +
      '#sb-desktop-settings #sb-desk-apply:hover{filter:brightness(1.1)}' +
      '#sb-desktop-gear{position:fixed;bottom:16px;left:16px;z-index:2147483645;width:40px;height:40px;border-radius:50%;border:2px solid #00ffff;background:#111;color:#00ffff;font-size:18px;cursor:pointer;box-shadow:0 0 10px rgba(0,255,255,.4)}';

    document.documentElement.appendChild(style);
    document.documentElement.appendChild(root);

    var gear = document.createElement('button');
    gear.id = 'sb-desktop-gear';
    gear.type = 'button';
    gear.title = 'Réglages Starblast Desktop';
    gear.textContent = '⚙';
    gear.style.display = 'none';
    document.documentElement.appendChild(gear);

    function hidePanel() {
      root.style.display = 'none';
      gear.style.display = 'block';
    }

    function showPanel() {
      root.style.display = 'block';
      var s = loadSettings();
      document.getElementById('sb-gem-color').value = s.gemColor;
      document.getElementById('sb-gem-world-glow').checked = s.gemWorldGlow !== false;
      document.getElementById('sb-gem-bar-neon').checked = s.gemBarNeon !== false;
      document.getElementById('sb-shield-color').value = s.shieldColor;
      document.getElementById('sb-shield-neon').checked = s.shieldBarNeon !== false;
      document.getElementById('sb-energy-color').value = s.energyColor;
      document.getElementById('sb-energy-neon').checked = s.energyBarNeon !== false;
      document.getElementById('sb-lb-neon').checked = s.leaderboardNeon !== false;
      document.getElementById('sb-lb-color').value = s.leaderboardColor;
    }

    document.getElementById('sb-desk-apply').addEventListener('click', function () {
      var ok = saveSettings({
        gemColor: document.getElementById('sb-gem-color').value,
        gemWorldGlow: document.getElementById('sb-gem-world-glow').checked,
        gemBarNeon: document.getElementById('sb-gem-bar-neon').checked,
        shieldColor: document.getElementById('sb-shield-color').value,
        shieldBarNeon: document.getElementById('sb-shield-neon').checked,
        energyColor: document.getElementById('sb-energy-color').value,
        energyBarNeon: document.getElementById('sb-energy-neon').checked,
        leaderboardNeon: document.getElementById('sb-lb-neon').checked,
        leaderboardColor: document.getElementById('sb-lb-color').value,
        fovMultiplier: loadSettings().fovMultiplier || DEFAULTS.fovMultiplier
      });
      if (!ok) return;
      localStorage.setItem('sbDesktopSettingsDismissed', '1');
      hidePanel();
    });

    gear.addEventListener('click', showPanel);

    if (localStorage.getItem('sbDesktopSettingsDismissed') === '1') {
      hidePanel();
    } else {
      showPanel();
    }
  }

  if (document.documentElement) createOverlay();
  else document.addEventListener('DOMContentLoaded', createOverlay);
})();
