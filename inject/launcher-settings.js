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
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
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
    var exp = getSettingsExport();
    if (!exp || !exp.parameters || !exp.parameters[id]) return;

    exp.parameters[id].value = value;
    if (typeof exp.set === 'function') {
      exp.set(id, value);
    } else {
      writeStoredParam(id, value);
    }
    if (typeof exp.save === 'function') {
      exp.save(id);
    } else {
      writeStoredParam(id, value);
    }
  }

  function buildSettingsFromLauncher(exp) {
    var saved = loadSaved();
    return {
      gemColor: getLauncherGemColor(),
      gemWorldGlow: !!exp.check('sb_gem_world_glow'),
      gemBarNeon: !!exp.check('sb_gem_glow'),
      shieldColor: String(exp.check('sb_shield_color') || saved.shieldColor || DEFAULTS.shieldColor),
      shieldBarNeon: !!exp.check('sb_shield_neon'),
      energyColor: String(exp.check('sb_energy_color') || saved.energyColor || DEFAULTS.energyColor),
      energyBarNeon: !!exp.check('sb_energy_neon'),
      leaderboardNeon: !!exp.check('sb_lb_neon'),
      leaderboardColor: String(exp.check('sb_lb_color') || saved.leaderboardColor || DEFAULTS.leaderboardColor),
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
      sb_gem_world_glow: readStoredParam('sb_gem_world_glow', saved.gemWorldGlow !== false),
      sb_gem_glow: readStoredParam('sb_gem_glow', saved.gemBarNeon !== false),
      sb_shield_color: readStoredParam('sb_shield_color', saved.shieldColor || DEFAULTS.shieldColor),
      sb_shield_neon: readStoredParam('sb_shield_neon', saved.shieldBarNeon !== false),
      sb_energy_color: readStoredParam('sb_energy_color', saved.energyColor || DEFAULTS.energyColor),
      sb_energy_neon: readStoredParam('sb_energy_neon', saved.energyBarNeon !== false),
      sb_lb_neon: readStoredParam('sb_lb_neon', saved.leaderboardNeon !== false),
      sb_lb_color: readStoredParam('sb_lb_color', saved.leaderboardColor || DEFAULTS.leaderboardColor)
    };

    SB_PARAM_KEYS.forEach(function (key) {
      if (!exp.parameters[key]) return;
      exp.parameters[key].value = map[key];
    });
  }

  function registerParameters() {
    var exp = getSettingsExport();
    if (!exp || !exp.parameters) return false;
    if (exp.parameters.sb_lb_color) {
      applyStoredValuesToParameters(exp);
      return true;
    }

    var saved = loadSaved();
    if (saved.gemBarNeon == null && saved.gemGlow != null) saved.gemBarNeon = saved.gemGlow;

    exp.parameters.sb_gem_world_glow = {
      name: 'Glow des gemmes (monde)',
      value: readStoredParam('sb_gem_world_glow', saved.gemWorldGlow !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_gem_glow = {
      name: 'Neon barre gemmes',
      value: readStoredParam('sb_gem_glow', saved.gemBarNeon !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_shield_color = {
      name: 'Couleur barre bouclier',
      value: readStoredParam('sb_shield_color', saved.shieldColor || DEFAULTS.shieldColor),
      skipauto: true,
      type: 'color',
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_shield_neon = {
      name: 'Neon barre bouclier',
      value: readStoredParam('sb_shield_neon', saved.shieldBarNeon !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_energy_color = {
      name: 'Couleur barre energie',
      value: readStoredParam('sb_energy_color', saved.energyColor || DEFAULTS.energyColor),
      skipauto: true,
      type: 'color',
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_energy_neon = {
      name: 'Neon barre energie',
      value: readStoredParam('sb_energy_neon', saved.energyBarNeon !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_lb_neon = {
      name: 'Leaderboard galaxie + neon pseudo',
      value: readStoredParam('sb_lb_neon', saved.leaderboardNeon !== false),
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_lb_color = {
      name: 'Couleur neon pseudo (leaderboard)',
      value: readStoredParam('sb_lb_color', saved.leaderboardColor || DEFAULTS.leaderboardColor),
      skipauto: true,
      type: 'color',
      filter: 'default,app,mobile'
    };

    applyStoredValuesToParameters(exp);
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
      '.modal .customfield[data-type]{max-width:280px!important}';
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
    if (registerParameters() || regTries > 500) clearInterval(regTimer);
  }, 100);

  setInterval(syncDesktopSettings, 400);
})();
