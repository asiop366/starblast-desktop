/**
 * Starblast Launcher integration — native Parametres entries + modal fix.
 */
(function () {
  'use strict';

  if (!window.__SB_DESKTOP_LAUNCHER_PATCH) return;
  if (window.__sbDesktopLauncherSettings) return;
  window.__sbDesktopLauncherSettings = true;

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

  var SB_PARAM_KEYS = [
    'sb_gem_world_glow', 'sb_gem_glow', 'sb_shield_color', 'sb_shield_neon',
    'sb_energy_color', 'sb_energy_neon', 'sb_lb_neon', 'sb_lb_color'
  ];

  var GEM_KEYS = ['gemcolor1', 'gemcolor2', 'gemindeed', 'gemindeed1'];
  var COLOR_PARAM_IDS = ['sb_shield_color', 'sb_energy_color', 'sb_lb_color'];

  function loadSaved() {
    try {
      return JSON.parse(localStorage.getItem('sbDesktopSettings') || '{}');
    } catch (e) {
      return {};
    }
  }

  function readStoredParam(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      var parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) return fallback;
      return parsed;
    } catch (e) {
      return fallback;
    }
  }

  function readParamValue(key, fallback) {
    var stored = readStoredParam(key, undefined);
    if (stored !== undefined) return stored;

    var exp = getSettingsExport();
    if (exp && exp.parameters && exp.parameters[key]) {
      return exp.parameters[key].value;
    }
    return fallback;
  }

  function writeStoredParam(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // ignore
    }
  }

  function getSettingsExport() {
    return window.module && window.module.exports && window.module.exports.settings;
  }

  function getLauncherGemColor() {
    var exp = getSettingsExport();
    try {
      if (exp) {
        if (exp.check('gemcolor1')) return String(exp.check('gemcolor1'));
        if (exp.check('gemindeed')) return String(exp.check('gemindeed'));
      }
      if (window.ClientStorage && window.ClientStorage.getGemColor1) {
        return String(window.ClientStorage.getGemColor1());
      }
    } catch (e) {
      // ignore
    }
    var saved = loadSaved();
    return saved.gemColor || DEFAULTS.gemColor;
  }

  function persistLauncherParam(id, value) {
    writeStoredParam(id, value);
    var exp = getSettingsExport();
    if (!exp || !exp.parameters || !exp.parameters[id]) return;

    exp.parameters[id].value = value;
    if (typeof exp.set === 'function') {
      try { exp.set(id, value); } catch (e) { /* ignore */ }
    }
  }

  function buildSettingsFromLauncher(exp) {
    var saved = loadSaved();
    return {
      gemColor: getLauncherGemColor(),
      gemWorldGlow: !!readParamValue('sb_gem_world_glow', saved.gemWorldGlow !== false),
      gemBarNeon: !!readParamValue('sb_gem_glow', saved.gemBarNeon !== false),
      shieldColor: String(readParamValue('sb_shield_color', saved.shieldColor || DEFAULTS.shieldColor)),
      shieldBarNeon: !!readParamValue('sb_shield_neon', saved.shieldBarNeon !== false),
      energyColor: String(readParamValue('sb_energy_color', saved.energyColor || DEFAULTS.energyColor)),
      energyBarNeon: !!readParamValue('sb_energy_neon', saved.energyBarNeon !== false),
      leaderboardNeon: !!readParamValue('sb_lb_neon', saved.leaderboardNeon !== false),
      leaderboardColor: String(readParamValue('sb_lb_color', saved.leaderboardColor || DEFAULTS.leaderboardColor)),
      fovMultiplier: saved.fovMultiplier || DEFAULTS.fovMultiplier
    };
  }

  function settingsChanged(a, b) {
    return a.gemColor !== b.gemColor ||
      a.gemWorldGlow !== b.gemWorldGlow ||
      a.gemBarNeon !== b.gemBarNeon ||
      a.shieldColor !== b.shieldColor ||
      a.shieldBarNeon !== b.shieldBarNeon ||
      a.energyColor !== b.energyColor ||
      a.energyBarNeon !== b.energyBarNeon ||
      a.leaderboardNeon !== b.leaderboardNeon ||
      a.leaderboardColor !== b.leaderboardColor;
  }

  function syncDesktopSettings() {
    var exp = getSettingsExport();
    if (!exp || !exp.parameters || !exp.parameters.sb_gem_glow) return;

    var next = buildSettingsFromLauncher(exp);
    var prev = window.__sbDesktopSettings || {};
    window.__sbDesktopSettings = next;

    if (settingsChanged(next, prev)) {
      try {
        localStorage.setItem('sbDesktopSettings', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new CustomEvent('sbDesktopSettingsChanged', { detail: next }));
    }
  }

  function applyStoredValuesToParameters(exp) {
    var saved = loadSaved();
    if (saved.gemBarNeon == null && saved.gemGlow != null) saved.gemBarNeon = saved.gemGlow;

    var map = {
      sb_gem_world_glow: readParamValue('sb_gem_world_glow', saved.gemWorldGlow !== false),
      sb_gem_glow: readParamValue('sb_gem_glow', saved.gemBarNeon !== false),
      sb_shield_color: readParamValue('sb_shield_color', saved.shieldColor || DEFAULTS.shieldColor),
      sb_shield_neon: readParamValue('sb_shield_neon', saved.shieldBarNeon !== false),
      sb_energy_color: readParamValue('sb_energy_color', saved.energyColor || DEFAULTS.energyColor),
      sb_energy_neon: readParamValue('sb_energy_neon', saved.energyBarNeon !== false),
      sb_lb_neon: readParamValue('sb_lb_neon', saved.leaderboardNeon !== false),
      sb_lb_color: readParamValue('sb_lb_color', saved.leaderboardColor || DEFAULTS.leaderboardColor)
    };

    SB_PARAM_KEYS.forEach(function (key) {
      if (!exp.parameters[key]) return;
      exp.parameters[key].value = map[key];
    });
  }

  function normalizeColorValue(value, fallback) {
    var v = String(value || fallback || DEFAULTS.shieldColor);
    if (v.charAt(0) !== '#') v = '#' + v;
    if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return v;
  }

  function enhanceSettingsPanel() {
    var exp = getSettingsExport();
    if (!exp) return;

    applyStoredValuesToParameters(exp);

    COLOR_PARAM_IDS.forEach(function (id) {
      var option = document.querySelector('.option input#' + id);
      if (!option) return;
      var row = option.closest('.option');
      if (!row || row.querySelector('input[type="color"]')) return;

      var label = exp.parameters[id] ? exp.parameters[id].name : id;
      var colorVal = normalizeColorValue(readParamValue(id, DEFAULTS.shieldColor), DEFAULTS.shieldColor);
      if (id === 'sb_energy_color') colorVal = normalizeColorValue(readParamValue(id, DEFAULTS.energyColor), DEFAULTS.energyColor);
      if (id === 'sb_lb_color') colorVal = normalizeColorValue(readParamValue(id, DEFAULTS.leaderboardColor), DEFAULTS.leaderboardColor);

      row.innerHTML =
        label +
        '<div class="range sb-color-row">' +
        '<input type="color" id="' + id + '" value="' + colorVal + '">' +
        '<span id="' + id + '_value">' + colorVal + '</span>' +
        '</div>';
    });

    SB_PARAM_KEYS.forEach(function (id) {
      if (COLOR_PARAM_IDS.indexOf(id) >= 0) return;
      var input = document.getElementById(id);
      if (!input || input.type !== 'checkbox') return;
      input.checked = !!readParamValue(id, true);
    });
  }

  function findSettingsUiHost() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }
      if (typeof obj.buildSettings === 'function' && typeof obj.showSettings === 'function') return obj;
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 35; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
    return null;
  }

  function hookSettingsUiHost() {
    if (window.__sbSettingsUiHooked) return;
    var host = findSettingsUiHost();
    if (!host) return;
    window.__sbSettingsUiHooked = true;

    var origBuild = host.buildSettings;
    host.buildSettings = function () {
      applyStoredValuesToParameters(getSettingsExport());
      var result = origBuild.apply(this, arguments);
      setTimeout(enhanceSettingsPanel, 0);
      return result;
    };

    var origShow = host.showSettings;
    host.showSettings = function () {
      applyStoredValuesToParameters(getSettingsExport());
      return origShow.apply(this, arguments);
    };
  }

  function hookSettingsModule(exp) {
    if (!exp || exp.__sbDesktopHooked) return;
    exp.__sbDesktopHooked = true;

    if (typeof exp.set === 'function') {
      var origSet = exp.set.bind(exp);
      exp.set = function (id, value) {
        var result = origSet(id, value);
        if (SB_PARAM_KEYS.indexOf(id) >= 0) {
          writeStoredParam(id, value);
          setTimeout(syncDesktopSettings, 0);
        }
        return result;
      };
    }
  }

  function registerParameters() {
    var exp = getSettingsExport();
    if (!exp || !exp.parameters) return false;
    if (exp.parameters.sb_lb_color) {
      applyStoredValuesToParameters(exp);
      hookSettingsModule(exp);
      return true;
    }

    var saved = loadSaved();
    if (saved.gemBarNeon == null && saved.gemGlow != null) saved.gemBarNeon = saved.gemGlow;

    exp.parameters.sb_gem_world_glow = {
      name: 'Glow des gemmes (monde)',
      value: readParamValue('sb_gem_world_glow', saved.gemWorldGlow !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_gem_glow = {
      name: 'Neon barre gemmes',
      value: readParamValue('sb_gem_glow', saved.gemBarNeon !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_shield_color = {
      name: 'Couleur barre bouclier',
      value: readParamValue('sb_shield_color', saved.shieldColor || DEFAULTS.shieldColor),
      skipauto: true,
      type: 'color',
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_shield_neon = {
      name: 'Neon barre bouclier',
      value: readParamValue('sb_shield_neon', saved.shieldBarNeon !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_energy_color = {
      name: 'Couleur barre energie',
      value: readParamValue('sb_energy_color', saved.energyColor || DEFAULTS.energyColor),
      skipauto: true,
      type: 'color',
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_energy_neon = {
      name: 'Neon barre energie',
      value: readParamValue('sb_energy_neon', saved.energyBarNeon !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_lb_neon = {
      name: 'Leaderboard galaxie + neon pseudo',
      value: readParamValue('sb_lb_neon', saved.leaderboardNeon !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_lb_color = {
      name: 'Couleur neon pseudo (leaderboard)',
      value: readParamValue('sb_lb_color', saved.leaderboardColor || DEFAULTS.leaderboardColor),
      skipauto: true,
      type: 'color',
      filter: 'default,app,mobile'
    };

    applyStoredValuesToParameters(exp);
    hookSettingsModule(exp);
    return true;
  }

  function hookSettingsPersistence() {
    if (window.__sbSettingsPersistHooked) return;
    window.__sbSettingsPersistHooked = true;

    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || !t.id || t.type !== 'color') return;
      if (SB_PARAM_KEYS.indexOf(t.id) < 0 && GEM_KEYS.indexOf(t.id) < 0) return;

      persistLauncherParam(t.id, t.value);
      var label = document.querySelector('#' + t.id + '_value');
      if (label) label.textContent = t.value;
      setTimeout(syncDesktopSettings, 30);
    }, true);

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.id) return;

      if (t.type === 'checkbox' && SB_PARAM_KEYS.indexOf(t.id) >= 0) {
        persistLauncherParam(t.id, t.checked);
        setTimeout(syncDesktopSettings, 30);
        return;
      }

      if (t.type === 'color' && (SB_PARAM_KEYS.indexOf(t.id) >= 0 || GEM_KEYS.indexOf(t.id) >= 0)) {
        persistLauncherParam(t.id, t.value);
        setTimeout(syncDesktopSettings, 30);
      }
    }, true);
  }

  function injectModalFixCss() {
    if (document.getElementById('sb-launcher-modal-fix')) return;

    var style = document.createElement('style');
    style.id = 'sb-launcher-modal-fix';
    style.textContent =
      '.modal .modalbody{max-height:90vh!important;overflow-y:auto!important;overflow-x:hidden!important}' +
      '.modal .modalbody>div>table{width:100%!important;max-width:920px!important;margin:0 auto!important;table-layout:fixed!important}' +
      '.modal .shippreview.frozenbg,.modal .ecpverifiedlogo.frozenbg{width:auto!important;max-width:200px!important;max-height:200px!important}' +
      '.modal .shippreview.frozenbg canvas,.modal .ecpverifiedlogo.frozenbg canvas,' +
      '.modal .shippreview.frozenbg img,.modal .ecpverifiedlogo.frozenbg img{max-width:180px!important;max-height:180px!important;width:auto!important;height:auto!important}' +
      '.modal .customfield[data-type]{max-width:280px!important}' +
      '.modal .option .sb-color-row{display:flex;align-items:center;gap:10px;margin-top:6px}' +
      '.modal .option .sb-color-row input[type=color]{width:42px;height:28px;padding:0;border:1px solid rgba(255,255,255,.25);background:transparent;cursor:pointer}' +
      '.modal .option .sb-color-row span{font-size:12px;opacity:.85;font-family:monospace}';
    document.documentElement.appendChild(style);
  }

  function isInActiveGame() {
    try {
      var settings = window.module.exports.settings;
      var entry = Object.values(settings).find(function (e) { return e && e.mode; });
      if (!entry || !entry.mode) return false;
      return entry.mode.id && entry.mode.id !== 'welcome';
    } catch (e) {
      return false;
    }
  }

  window.__sbDesktopIsInActiveGame = isInActiveGame;

  injectModalFixCss();
  hookSettingsPersistence();

  var regTries = 0;
  var regTimer = setInterval(function () {
    regTries += 1;
    hookSettingsUiHost();
    if (registerParameters() || regTries > 500) clearInterval(regTimer);
  }, 100);

  setInterval(function () {
    hookSettingsUiHost();
    syncDesktopSettings();
  }, 400);
})();
