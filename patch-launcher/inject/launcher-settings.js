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

  function loadSaved() {
    try {
      return JSON.parse(localStorage.getItem('sbDesktopSettings') || '{}');
    } catch (e) {
      return {};
    }
  }

  function getLauncherGemColor() {
    try {
      if (window.module && window.module.exports && window.module.exports.settings) {
        var c = window.module.exports.settings.check('gemcolor1');
        if (c) return String(c);
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
    var exp = window.module && window.module.exports && window.module.exports.settings;
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

  function registerParameters() {
    var exp = window.module && window.module.exports && window.module.exports.settings;
    if (!exp || !exp.parameters) return false;
    if (exp.parameters.sb_lb_color) return true;

    var saved = loadSaved();
    if (saved.gemBarNeon == null && saved.gemGlow != null) saved.gemBarNeon = saved.gemGlow;

    exp.parameters.sb_gem_world_glow = {
      name: 'Glow des gemmes (monde)',
      value: saved.gemWorldGlow !== false,
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_gem_glow = {
      name: 'Neon barre gemmes',
      value: saved.gemBarNeon !== false,
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_shield_color = {
      name: 'Couleur barre bouclier',
      value: saved.shieldColor || DEFAULTS.shieldColor,
      skipauto: true,
      type: 'color',
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_shield_neon = {
      name: 'Neon barre bouclier',
      value: saved.shieldBarNeon !== false,
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_energy_color = {
      name: 'Couleur barre energie',
      value: saved.energyColor || DEFAULTS.energyColor,
      skipauto: true,
      type: 'color',
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_energy_neon = {
      name: 'Neon barre energie',
      value: saved.energyBarNeon !== false,
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_lb_neon = {
      name: 'Leaderboard galaxie + neon pseudo',
      value: saved.leaderboardNeon !== false,
      skipauto: true,
      filter: 'default,app,mobile'
    };

    exp.parameters.sb_lb_color = {
      name: 'Couleur neon pseudo (leaderboard)',
      value: saved.leaderboardColor || DEFAULTS.leaderboardColor,
      skipauto: true,
      type: 'color',
      filter: 'default,app,mobile'
    };

    return true;
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
      '#home #colors{max-width:520px!important}';
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

  var SB_SETTING_IDS = [
    'sb_gem_world_glow', 'sb_gem_glow', 'sb_shield_color', 'sb_shield_neon',
    'sb_energy_color', 'sb_energy_neon', 'sb_lb_neon', 'sb_lb_color',
    'gemcolor1', 'gemcolor2'
  ];

  window.__sbDesktopIsInActiveGame = isInActiveGame;

  injectModalFixCss();

  var regTries = 0;
  var regTimer = setInterval(function () {
    regTries += 1;
    if (registerParameters() || regTries > 500) clearInterval(regTimer);
  }, 100);

  setInterval(syncDesktopSettings, 400);

  function isSbSetting(id) {
    return id && SB_SETTING_IDS.indexOf(id) >= 0;
  }

  document.addEventListener('change', function (e) {
    if (isSbSetting(e.target && e.target.id)) setTimeout(syncDesktopSettings, 50);
  }, true);

  document.addEventListener('input', function (e) {
    var id = e.target && e.target.id;
    if (id && (id.indexOf('_color') >= 0 || id === 'gemcolor1' || id === 'gemcolor2')) {
      setTimeout(syncDesktopSettings, 50);
    }
  }, true);
})();
