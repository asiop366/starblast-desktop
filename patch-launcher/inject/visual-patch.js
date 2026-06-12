/**
 * Starblast.io visual overrides — performance-safe desktop mod pack.
 */
(function () {
  'use strict';

  if (window.__sbDesktopPatchLoaded) return;
  window.__sbDesktopPatchLoaded = true;

  var STORAGE_KEY = 'sbDesktopSettings';
  var VIEW_MAX_FOV = 95;
  var RADAR_DEZOOM = 2.0;

  var HUD_DISPLAY_SIZE = 13;
  var HUD_SHIELD_INDEX = 14;
  var HUD_GENERATOR_INDEX = 27;
  var HUD_CRYSTAL_INDEX = 40;

  var DEFAULTS = {
    gemColor: '#ffffff',
    gemWorldGlow: true,
    gemBarNeon: true,
    shieldColor: '#00ffff',
    shieldBarNeon: true,
    energyColor: '#ff69b4',
    energyBarNeon: true,
    leaderboardNeon: true,
    leaderboardColor: '#ff33cc',
    fovMultiplier: 1.2
  };

  var galaxyPatternCache = {};

  var COLORS = {
    black: 0x000000,
    white: 0xffffff,
    pink: 0xff69b4,
    cyan: 0x00ffff,
    asteroidBody: 0x000000,
    asteroidEmissive: 0xffffff,
    asteroidSpecular: 0xaaaaaa,
    crystalEmissive: 0xffffff
  };

  var canvasHooksInstalled = false;
  var wheelHookInstalled = false;
  var liveFovMultiplier = null;
  var cachedHudGeom = null;
  var cachedFigures = null;
  var scannedScenes = typeof WeakSet === 'function' ? new WeakSet() : null;
  var hookedGameMode = null;
  var radarBackgrounds = [];
  var radarTextures = [];
  var fieldAsteroidMaterial = null;
  var meteoriteMaterials = [];
  var asteroidMeshes = [];
  var sharedMaterialScanDone = false;
  var scorePanelHooked = false;
  var gemMaterials = [];

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

  function readSbParam(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      try {
        var parsed = JSON.parse(raw);
        if (parsed !== null && parsed !== undefined) return parsed;
      } catch (e) {
        return raw;
      }
    } catch (e) {
      // ignore
    }
    return fallback;
  }

  function normalizeColorString(value, fallback) {
    var v = String(value == null ? '' : value).trim();
    if (!v) {
      v = String(fallback || '#ffffff').trim();
      if (v.charAt(0) !== '#') v = '#' + v;
    }
    if (v.charAt(0) !== '#') v = '#' + v.replace(/^#/, '');
    if (v.length === 4) {
      v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    return v.toLowerCase();
  }

  function readLauncherColor(exp, key, fallback) {
    var input = document.getElementById(key);
    if (input && input.type === 'color' && input.value) {
      return normalizeColorString(input.value, fallback);
    }
    if (exp && exp.parameters && exp.parameters[key] && exp.parameters[key].value != null) {
      return normalizeColorString(exp.parameters[key].value, fallback);
    }
    try {
      var checked = exp && exp.check ? exp.check(key) : null;
      if (checked != null && checked !== false) {
        return normalizeColorString(String(checked), fallback);
      }
    } catch (e) {
      // ignore
    }
    var fromStore = readSbParam(key, undefined);
    if (fromStore !== undefined) return normalizeColorString(String(fromStore), fallback);
    return normalizeColorString(fallback, fallback);
  }

  function readLauncherBool(exp, key, fallback) {
    var fromStore = readSbParam(key, undefined);
    if (fromStore !== undefined) return !!fromStore;
    try {
      return !!exp.check(key);
    } catch (e) {
      return fallback;
    }
  }

  function getSettings() {
    if (window.__SB_DESKTOP_LAUNCHER_PATCH && window.module && window.module.exports && window.module.exports.settings) {
      var exp = window.module.exports.settings;
      if (exp.parameters && exp.parameters.sb_gem_glow) {
        var gem = '#ffffff';
        try {
          if (exp.check('gemcolor1')) gem = String(exp.check('gemcolor1'));
          else if (exp.check('gemindeed')) gem = String(exp.check('gemindeed'));
          else if (window.ClientStorage && window.ClientStorage.getGemColor1) gem = String(window.ClientStorage.getGemColor1());
        } catch (e) {
          // ignore
        }
        return normalizeSettings({
          gemColor: gem,
          gemWorldGlow: readLauncherBool(exp, 'sb_gem_world_glow', true),
          gemBarNeon: readLauncherBool(exp, 'sb_gem_glow', true),
          shieldColor: readLauncherColor(exp, 'sb_shield_color', DEFAULTS.shieldColor),
          shieldBarNeon: readLauncherBool(exp, 'sb_shield_neon', true),
          energyColor: readLauncherColor(exp, 'sb_energy_color', DEFAULTS.energyColor),
          energyBarNeon: readLauncherBool(exp, 'sb_energy_neon', true),
          leaderboardNeon: readLauncherBool(exp, 'sb_lb_neon', true),
          leaderboardColor: readLauncherColor(exp, 'sb_lb_color', DEFAULTS.leaderboardColor),
          fovMultiplier: (window.__sbDesktopSettings && window.__sbDesktopSettings.fovMultiplier) || DEFAULTS.fovMultiplier
        });
      }
    }
    var cached = window.__sbDesktopSettings || loadSettings();
    return normalizeSettings(cached);
  }

  function applyColorsFromSettings() {
    var s = getSettings();
    var gemHex = hexToInt(s.gemColor);
    COLORS.white = gemHex;
    COLORS.crystalEmissive = gemHex;
    COLORS.pink = hexToInt(s.energyColor);
    COLORS.cyan = hexToInt(s.shieldColor);
  }

  function getFovMultiplier() {
    if (liveFovMultiplier != null) return liveFovMultiplier;
    return getSettings().fovMultiplier || DEFAULTS.fovMultiplier;
  }

  function hexToInt(hex) {
    var v = String(hex || '#ffffff').replace('#', '');
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    return parseInt(v, 16) || 0xffffff;
  }

  function hexToCss(hex) {
    var h = String(hex || '#ffffff');
    return h.charAt(0) === '#' ? h : '#' + h;
  }

  function lightenHex(hex, amount) {
    var n = hexToInt(hex);
    var r = Math.min(255, ((n >> 16) & 255) + amount);
    var g = Math.min(255, ((n >> 8) & 255) + amount);
    var b = Math.min(255, (n & 255) + amount);
    return '#' + ('000000' + ((r << 16) | (g << 8) | b).toString(16)).slice(-6);
  }

  function darkenHex(hex, amount) {
    var n = hexToInt(hex);
    var r = Math.max(0, ((n >> 16) & 255) - amount);
    var g = Math.max(0, ((n >> 8) & 255) - amount);
    var b = Math.max(0, (n & 255) - amount);
    return '#' + ('000000' + ((r << 16) | (g << 8) | b).toString(16)).slice(-6);
  }

  function getLeaderboardAccent() {
    var exp = window.module && window.module.exports && window.module.exports.settings;
    return readLauncherColor(exp, 'sb_lb_color', DEFAULTS.leaderboardColor);
  }

  function darkFillFromAccent(accent) {
    var n = hexToInt(accent);
    var r = Math.max(0, Math.floor(((n >> 16) & 255) * 0.06));
    var g = Math.max(0, Math.floor(((n >> 8) & 255) * 0.06));
    var b = Math.max(0, Math.floor((n & 255) * 0.06));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function rgbaFromHex(hex, alpha) {
    var n = hexToInt(hex);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function neonRgbFromHex(hex) {
    var rgb = hexToRgb01(hexToInt(hex));
    return [
      Math.min(1, rgb[0] * 1.55 + 0.55),
      Math.min(1, rgb[1] * 1.55 + 0.55),
      Math.min(1, rgb[2] * 1.55 + 0.55)
    ];
  }

  function neonPulse() {
    var t = Date.now() * 0.001;
    return 0.5 + 0.5 * Math.sin(t * 7.5);
  }

  function neonFlash() {
    var t = Date.now() * 0.001;
    return 0.65 + 0.35 * Math.abs(Math.sin(t * 13));
  }

  function shouldApplyGameplayVisuals() {
    if (!window.__SB_DESKTOP_LAUNCHER_PATCH) return true;
    if (typeof window.__sbDesktopIsInActiveGame === 'function') {
      return window.__sbDesktopIsInActiveGame();
    }
    return true;
  }

  applyColorsFromSettings();
  window.addEventListener('sbDesktopSettingsChanged', function () {
    applyColorsFromSettings();
    galaxyPatternCache = {};
    sharedMaterialScanDone = false;
    scorePanelHooked = false;
    refreshGemMaterials();
    if (cachedFigures) patchFiguresInstance(cachedFigures);
    else if (cachedHudGeom) patchHudGeometry(cachedHudGeom);
  });

  window.addEventListener('storage', function (e) {
    if (!e || !e.key) return;
    if (e.key === 'sb_lb_color' || e.key === 'sbDesktopSettings') {
      galaxyPatternCache = {};
    }
  });

  function isPhong(mat) {
    return mat && mat.type === 'MeshPhongMaterial';
  }

  function isLambert(mat) {
    return mat && mat.type === 'MeshLambertMaterial';
  }

  function isPerspectiveCamera(cam) {
    return cam && cam.type === 'PerspectiveCamera';
  }

  function hexToRgb01(hex) {
    return [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];
  }

  function setHex(color, value) {
    if (color && color.setHex) color.setHex(value);
  }

  function hasVertexColors(mat) {
    return mat.vertexColors === 2 || mat.vertexColors === true;
  }

  function isFieldAsteroidMaterial(mat) {
    if (!isLambert(mat) || !hasVertexColors(mat) || mat.map || mat.emissiveMap) return false;
    return true;
  }

  function isWorldGemMaterial(mat) {
    if (!isPhong(mat) || !mat.transparent) return false;
    if (mat.depthWrite === false) return true;
    var hex = mat.color && mat.color.getHex ? mat.color.getHex() : 0;
    return hex === 0xff0000 || hex === 0xffa000 || hex === 0xff8800 || hex === 0xff4400;
  }

  function isDiamondMaterial(mat) {
    return isPhong(mat) && mat.transparent && mat.bumpMap &&
      mat.side === 2 && mat.opacity <= 0.65;
  }

  function isSnowballAsteroid(mat) {
    return isPhong(mat) && mat.map && mat.emissiveMap && mat.specularMap &&
      mat.color && mat.color.getHex() === 0xffffff;
  }

  function isRockAsteroid(mat) {
    if (!isPhong(mat) || !mat.bumpMap || mat.transparent) return false;
    if (isWorldGemMaterial(mat) || isDiamondMaterial(mat) || isSnowballAsteroid(mat)) return false;
    if (mat.emissiveMap && mat.specularMap) return false;
    if (mat.__sbAsteroidPatched) return true;
    var hex = mat.color && mat.color.getHex ? mat.color.getHex() : 0xffffff;
    return hex === 0x000000 || hex === 0x507800 || hex === 0xa0a0a0 || hex === 0x606060 ||
      hex === 0x805030 || hex === 0xa09070 || hex === 0x808080 ||
      (hex >= 0x404040 && hex <= 0xc0c0c0);
  }

  function isMeteoriteMaterial(mat) {
    return isFieldAsteroidMaterial(mat) || isRockAsteroid(mat) || isSnowballAsteroid(mat);
  }

  function trackMeteoriteMaterial(mat) {
    if (!mat || meteoriteMaterials.indexOf(mat) >= 0) return;
    meteoriteMaterials.push(mat);
  }

  function ensureAsteroidEmissive(mat) {
    if (!mat) return;
    if (!mat.emissive && window.THREE && window.THREE.Color) {
      mat.emissive = new window.THREE.Color(COLORS.asteroidEmissive);
    }
    if (mat.emissive) setHex(mat.emissive, COLORS.asteroidEmissive);
  }

  function patchAsteroidMaterial(mat) {
    if (!mat) return;
    setHex(mat.color, COLORS.asteroidBody);
    if (isFieldAsteroidMaterial(mat)) {
      ensureAsteroidEmissive(mat);
      mat.vertexColors = 2;
    } else {
      ensureAsteroidEmissive(mat);
      if (mat.specular) setHex(mat.specular, COLORS.asteroidSpecular);
      if (mat.shininess != null) mat.shininess = Math.max(mat.shininess, 120);
      if (mat.emissiveIntensity != null) mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 0.85);
    }
    mat.__sbAsteroidPatched = true;
    trackMeteoriteMaterial(mat);
    if (isFieldAsteroidMaterial(mat)) fieldAsteroidMaterial = mat;
  }

  function refreshMeteoriteMaterials() {
    for (var i = 0; i < meteoriteMaterials.length; i++) {
      var mat = meteoriteMaterials[i];
      setHex(mat.color, COLORS.asteroidBody);
      if (mat.emissive) setHex(mat.emissive, COLORS.asteroidEmissive);
    }
    if (fieldAsteroidMaterial) {
      setHex(fieldAsteroidMaterial.color, COLORS.asteroidBody);
      if (fieldAsteroidMaterial.emissive) {
        setHex(fieldAsteroidMaterial.emissive, COLORS.asteroidEmissive);
      }
    }
  }

  function trackGemMaterial(mat) {
    if (!mat || gemMaterials.indexOf(mat) >= 0) return;
    gemMaterials.push(mat);
  }

  function refreshGemMaterials() {
    for (var i = 0; i < gemMaterials.length; i++) {
      gemMaterials[i].__sbGemPatched = false;
      patchGemMaterial(gemMaterials[i]);
    }
  }

  function patchGemMaterial(mat) {
    if (!mat || mat.__sbGemPatched) return;
    trackGemMaterial(mat);
    applyColorsFromSettings();
    var s = getSettings();
    setHex(mat.color, COLORS.white);
    if (mat.specular) setHex(mat.specular, COLORS.white);
    if (s.gemWorldGlow !== false) {
      if (mat.emissive) setHex(mat.emissive, COLORS.crystalEmissive);
      mat.shininess = s.gemBarNeon !== false ? 180 : 130;
      if (mat.emissiveIntensity != null) mat.emissiveIntensity = s.gemBarNeon !== false ? 1.2 : 0.6;
      if (mat.transparent) mat.opacity = Math.max(mat.opacity || 0.7, s.gemBarNeon !== false ? 0.98 : 0.94);
    } else {
      if (mat.emissive) setHex(mat.emissive, 0x111111);
      mat.shininess = 48;
      if (mat.transparent) mat.opacity = Math.min(mat.opacity || 0.7, 0.82);
    }
    mat.__sbGemPatched = true;
  }

  function geometryNeedsAsteroidFaces(geom) {
    if (!geom || !geom.faces || !geom.faces.length) return false;
    var face = geom.faces[0];
    if (!face.vertexColors || !face.vertexColors[0] || !face.vertexColors[0].getHex) return true;
    return face.vertexColors[0].getHex() !== COLORS.asteroidBody;
  }

  function patchFieldAsteroidGeometry(geom) {
    if (!geom || !geom.faces || !geom.faces.length) return;
    if (!geometryNeedsAsteroidFaces(geom)) return;

    for (var i = 0; i < geom.faces.length; i++) {
      var face = geom.faces[i];
      if (!face.vertexColors) continue;
      for (var j = 0; j < face.vertexColors.length; j++) {
        setHex(face.vertexColors[j], COLORS.asteroidBody);
      }
    }
    geom.colorsNeedUpdate = true;
  }

  function findSharedFieldMaterial() {
    if (sharedMaterialScanDone && fieldAsteroidMaterial) return fieldAsteroidMaterial;

    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    var steps = 0;

    while (stack.length && steps < 8000) {
      steps += 1;
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (obj.lIOII && isFieldAsteroidMaterial(obj.lIOII)) {
        fieldAsteroidMaterial = obj.lIOII;
        patchAsteroidMaterial(obj.lIOII);
        sharedMaterialScanDone = true;
        return obj.lIOII;
      }

      var keys;
      try {
        keys = Object.keys(obj);
      } catch (e) {
        continue;
      }

      for (var i = 0; i < keys.length && i < 40; i++) {
        var key = keys[i];
        if (key === 'parent' || key === 'window' || key === 'top' || key === 'document') continue;
        try {
          var child = obj[key];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) {
          // ignore
        }
      }
    }

    sharedMaterialScanDone = true;
    return fieldAsteroidMaterial;
  }

  function patchRadarShaderMaterial(mat) {
    if (!mat || mat.__sbRadarShaderPatched || !mat.vertexShader) return;
    if (mat.vertexShader.indexOf('l0111.xy') < 0) return;

    mat.vertexShader = mat.vertexShader.replace(
      /l0111\.xy \*= ([\d.]+)/,
      function (match, zoom) {
        return 'l0111.xy *= ' + (parseFloat(zoom) / RADAR_DEZOOM);
      }
    );
    mat.__sbRadarShaderPatched = true;
    mat.needsUpdate = true;
  }

  function patchMaterial(mat) {
    if (!mat) return;
    patchRadarShaderMaterial(mat);
    if (isMeteoriteMaterial(mat)) {
      patchAsteroidMaterial(mat);
      return;
    }
    if (!isPhong(mat)) return;
    if (isWorldGemMaterial(mat) || isDiamondMaterial(mat)) {
      patchGemMaterial(mat);
    }
  }

  function isHudGeometry(geom) {
    if (!geom || !geom.attributes) return false;
    var fig = geom.attributes.figure;
    var col = geom.attributes.color;
    var fill = geom.attributes.fill;
    if (!fig || !col || !fill || !fig.array || !col.array) return false;
    return fig.array.length >= 53 && col.array.length === fig.array.length * 3;
  }

  function paintHudBar(colors, figures, start, fillHex, bgHex, iconRgb) {
    var fill = hexToRgb01(fillHex);
    var bg = hexToRgb01(bgHex);
    var end = start + HUD_DISPLAY_SIZE;

    for (var i = start; i < end; i++) {
      var f = figures[i];
      var rgb = f === 16 ? fill : (f === 0 ? bg : (iconRgb || [1, 1, 1]));
      colors[3 * i] = rgb[0];
      colors[3 * i + 1] = rgb[1];
      colors[3 * i + 2] = rgb[2];
    }
  }

  function hudColorBuffer(target) {
    if (!target) return null;
    if (target.attributes && target.attributes.color && target.attributes.color.array) {
      return target.attributes.color.array;
    }
    if (target.color) return target.color;
    return null;
  }

  function hudAttrArray(target, name, fallbackKey) {
    if (!target) return null;
    if (target.attributes && target.attributes[name] && target.attributes[name].array) {
      return target.attributes[name].array;
    }
    if (fallbackKey && target[fallbackKey]) return target[fallbackKey];
    return null;
  }

  function applyHudBarNeon(geom, figures, startIndex, enabled, fillHex) {
    if (!enabled) return;

    var colors = hudColorBuffer(geom);
    if (!colors) return;
    var opac = hudAttrArray(geom, 'opac', 'opac');
    var sizes = hudAttrArray(geom, 'Ol11I', 'Ol11I');
    var verts = hudAttrArray(geom, 'position', 'vertices');
    var pulse = neonPulse();
    var flash = neonFlash();
    var glowRgb = neonRgbFromHex(fillHex);
    var hotRgb = [
      Math.min(1, (glowRgb[0] * 1.65 + 0.45) * flash),
      Math.min(1, (glowRgb[1] * 1.65 + 0.45) * flash),
      Math.min(1, (glowRgb[2] * 1.65 + 0.45) * flash)
    ];
    var coreRgb = [
      Math.min(1, hotRgb[0] * (0.85 + pulse * 0.3)),
      Math.min(1, hotRgb[1] * (0.85 + pulse * 0.3)),
      Math.min(1, hotRgb[2] * (0.85 + pulse * 0.3))
    ];
    var end = startIndex + HUD_DISPLAY_SIZE;

    for (var i = startIndex; i < end; i++) {
      var fig = figures[i];
      if (fig === 16) {
        colors[3 * i] = coreRgb[0];
        colors[3 * i + 1] = coreRgb[1];
        colors[3 * i + 2] = coreRgb[2];
        if (opac) opac[i] = 1;
        if (sizes) sizes[i] = 0.11 + pulse * 0.04;
        if (verts) verts[3 * i + 2] = 0;
      } else if (fig === 0) {
        colors[3 * i] = Math.min(1, glowRgb[0] * (0.75 + pulse * 0.25) + 0.15);
        colors[3 * i + 1] = Math.min(1, glowRgb[1] * (0.75 + pulse * 0.25) + 0.15);
        colors[3 * i + 2] = Math.min(1, glowRgb[2] * (0.75 + pulse * 0.25) + 0.15);
        if (opac) opac[i] = 1;
        if (sizes) sizes[i] = 0.085 + pulse * 0.025;
        if (verts) verts[3 * i + 2] = 0;
      } else if (fig === 11 || fig === 12 || fig === 13) {
        colors[3 * i] = hotRgb[0];
        colors[3 * i + 1] = hotRgb[1];
        colors[3 * i + 2] = hotRgb[2];
        if (sizes) sizes[i] = Math.max(sizes[i] || 0.02, 0.065 + pulse * 0.02);
        if (opac) opac[i] = 1;
      } else if (fig > 0 && fig !== 16) {
        colors[3 * i] = Math.min(1, glowRgb[0] * 1.1 + 0.35);
        colors[3 * i + 1] = Math.min(1, glowRgb[1] * 1.1 + 0.35);
        colors[3 * i + 2] = Math.min(1, glowRgb[2] * 1.1 + 0.35);
        if (sizes) sizes[i] = Math.max(sizes[i] || 0.015, 0.05 + pulse * 0.015);
        if (opac) opac[i] = 1;
      }
    }
  }

  function isScoreboardRowRect(ctx, rw, rh) {
    if (!ctx || !ctx.canvas) return false;
    var cw = ctx.canvas.width;
    var ch = ctx.canvas.height;
    if (rw >= cw * 0.35 && rh >= 5 && rh <= Math.max(48, ch / 2)) return true;
    return rw >= 48 && rh >= 5 && rh <= Math.max(40, ch / 2.5);
  }

  function patchHudGeometry(geom) {
    if (!isHudGeometry(geom)) return;

    var s = getSettings();
    var colors = geom.attributes.color.array;
    var figures = geom.attributes.figure.array;

    paintHudBar(colors, figures, HUD_CRYSTAL_INDEX, COLORS.white, COLORS.black, [1, 1, 1]);
    paintHudBar(colors, figures, HUD_GENERATOR_INDEX, COLORS.pink, COLORS.black);
    paintHudBar(colors, figures, HUD_SHIELD_INDEX, COLORS.cyan, COLORS.black);
    applyHudBarNeon(geom, figures, HUD_CRYSTAL_INDEX, s.gemBarNeon !== false, s.gemColor);
    applyHudBarNeon(geom, figures, HUD_GENERATOR_INDEX, s.energyBarNeon !== false, s.energyColor);
    applyHudBarNeon(geom, figures, HUD_SHIELD_INDEX, s.shieldBarNeon !== false, s.shieldColor);

    geom.attributes.color.needsUpdate = true;
    if (geom.attributes.opac) geom.attributes.opac.needsUpdate = true;
    if (geom.attributes.Ol11I) geom.attributes.Ol11I.needsUpdate = true;
  }

  function hookFiguresInstance(fig) {
    if (!fig || fig.__sbBarHooked) return;

    if (typeof fig.setBarColor === 'function') {
      var originalSetBarColor = fig.setBarColor;
      fig.setBarColor = function (start, r, g, b) {
        var out = originalSetBarColor.apply(this, arguments);
        if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
          patchFiguresInstance(this);
        }
        return out;
      };
    }

    if (typeof fig.setBar === 'function') {
      var originalSetBar = fig.setBar;
      fig.setBar = function (start, value, max) {
        var out = originalSetBar.apply(this, arguments);
        if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
          patchFiguresInstance(this);
        }
        return out;
      };
    }

    fig.__sbBarHooked = true;
  }

  function patchFiguresInstance(fig) {
    if (!fig || typeof fig.crystal_index !== 'number' || !fig.color || !fig.figure) return;

    var s = getSettings();
    hookFiguresInstance(fig);
    applyColorsFromSettings();
    paintHudBar(fig.color, fig.figure, fig.crystal_index, COLORS.white, COLORS.black, [1, 1, 1]);
    paintHudBar(fig.color, fig.figure, fig.generator_index, COLORS.pink, COLORS.black);
    paintHudBar(fig.color, fig.figure, fig.shield_index, COLORS.cyan, COLORS.black);

    applyHudBarNeon(fig, fig.figure, fig.crystal_index, s.gemBarNeon !== false, s.gemColor);
    applyHudBarNeon(fig, fig.figure, fig.generator_index, s.energyBarNeon !== false, s.energyColor);
    applyHudBarNeon(fig, fig.figure, fig.shield_index, s.shieldBarNeon !== false, s.shieldColor);

    if (fig.geometry && isHudGeometry(fig.geometry)) {
      applyHudBarNeon(fig.geometry, fig.figure, fig.crystal_index, s.gemBarNeon !== false, s.gemColor);
      applyHudBarNeon(fig.geometry, fig.figure, fig.generator_index, s.energyBarNeon !== false, s.energyColor);
      applyHudBarNeon(fig.geometry, fig.figure, fig.shield_index, s.shieldBarNeon !== false, s.shieldColor);
      var colAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('color');
      if (colAttr) colAttr.needsUpdate = true;
      var opAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('opac');
      if (opAttr) opAttr.needsUpdate = true;
      var sizeAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('Ol11I');
      if (sizeAttr) sizeAttr.needsUpdate = true;
      var posAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('position');
      if (posAttr) posAttr.needsUpdate = true;
    }
  }

  function getBaseRadarZoom() {
    if (hookedGameMode && hookedGameMode.__sbBaseRadarZoom != null) {
      return hookedGameMode.__sbBaseRadarZoom;
    }
    return 2;
  }

  function getEffectiveRadarZoom() {
    return getBaseRadarZoom() / RADAR_DEZOOM;
  }

  function hookGameModeRadarZoom() {
    if (hookedGameMode) return hookedGameMode;

    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    var steps = 0;

    while (stack.length && steps < 6000) {
      steps += 1;
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (obj.lI1IO && obj.lI1IO.mode && typeof obj.lI1IO.mode.radar_zoom === 'number') {
        var mode = obj.lI1IO.mode;
        if (!mode.__sbRadarHooked) {
          var storedZoom = mode.radar_zoom || 2;
          mode.__sbBaseRadarZoom = storedZoom;
          try {
            Object.defineProperty(mode, 'radar_zoom', {
              configurable: true,
              enumerable: true,
              get: function () {
                return (mode.__sbBaseRadarZoom || storedZoom) / RADAR_DEZOOM;
              },
              set: function (v) {
                mode.__sbBaseRadarZoom = v;
              }
            });
          } catch (e) {
            mode.radar_zoom = storedZoom / RADAR_DEZOOM;
          }
          mode.__sbRadarHooked = true;
        }
        hookedGameMode = mode;
        return mode;
      }

      var keys;
      try {
        keys = Object.keys(obj);
      } catch (e) {
        continue;
      }

      for (var i = 0; i < keys.length && i < 40; i++) {
        var key = keys[i];
        if (key === 'parent' || key === 'window' || key === 'top' || key === 'document') continue;
        try {
          var child = obj[key];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) {
          // ignore
        }
      }
    }

    return null;
  }

  function rememberRadarBackground(obj) {
    if (!obj || typeof obj.llII0 !== 'function' || !obj.texture || !obj.texture.repeat) return;
    if (radarBackgrounds.indexOf(obj) >= 0) return;
    radarBackgrounds.push(obj);
    if (radarTextures.indexOf(obj.texture) < 0) radarTextures.push(obj.texture);
  }

  function rememberRadarTexture(map) {
    if (!map || !map.repeat || radarTextures.indexOf(map) >= 0) return;
    radarTextures.push(map);
  }

  function refreshRadarPerFrame() {
    hookGameModeRadarZoom();
    var zoom = getEffectiveRadarZoom();
    if (zoom <= 0) return;

    var repeat = 1 / zoom;
    for (var i = 0; i < radarTextures.length; i++) {
      var map = radarTextures[i];
      if (map && map.repeat) map.repeat.set(repeat, repeat);
    }
  }

  function patchCamera(camera) {
    if (!shouldApplyGameplayVisuals()) return;
    if (!isPerspectiveCamera(camera)) return;
    if (camera.fov < 38 || camera.fov > 58) return;

    var target = Math.min(camera.fov * getFovMultiplier(), VIEW_MAX_FOV);
    if (Math.abs(camera.fov - target) > 0.05) {
      camera.fov = target;
      camera.updateProjectionMatrix();
    }
  }

  function rememberHud(obj) {
    if (obj.geometry && isHudGeometry(obj.geometry)) cachedHudGeom = obj.geometry;
    if (typeof obj.crystal_index === 'number') cachedFigures = obj;
  }

  function isAsteroidMesh(obj) {
    if (!obj || !obj.geometry || !obj.material) return false;
    var mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    if (obj.geometry.type === 'IcosahedronGeometry' && isLambert(mat) && hasVertexColors(mat)) return true;
    if (isMeteoriteMaterial(mat)) return true;
    return false;
  }

  function rememberAsteroid(obj) {
    if (!isAsteroidMesh(obj)) return;
    if (asteroidMeshes.indexOf(obj) >= 0) return;
    asteroidMeshes.push(obj);
    var mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    patchAsteroidMaterial(mat);
    patchFieldAsteroidGeometry(obj.geometry);
  }

  function refreshAsteroidMeshes() {
    findSharedFieldMaterial();

    if (fieldAsteroidMaterial) {
      setHex(fieldAsteroidMaterial.color, COLORS.asteroidBody);
      if (fieldAsteroidMaterial.emissive) {
        setHex(fieldAsteroidMaterial.emissive, COLORS.asteroidEmissive);
      }
    }

    for (var i = 0; i < asteroidMeshes.length; i++) {
      var obj = asteroidMeshes[i];
      if (!obj) continue;
      var mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      setHex(mat.color, COLORS.asteroidBody);
      if (mat.emissive) setHex(mat.emissive, COLORS.asteroidEmissive);
      if (obj.geometry) patchFieldAsteroidGeometry(obj.geometry);
    }
  }

  function patchObject(obj) {
    if (!obj) return;
    rememberHud(obj);
    rememberRadarBackground(obj);
    rememberAsteroid(obj);

    if (obj.material && obj.material.map) rememberRadarTexture(obj.material.map);

    var material = obj.material;
    if (!material) return;
    if (Array.isArray(material)) material.forEach(patchMaterial);
    else patchMaterial(material);
  }

  function scanSceneOnce(scene) {
    if (!scene || !scene.traverse) return;
    if (scannedScenes && scannedScenes.has(scene)) return;
    scene.traverse(patchObject);
    if (scannedScenes) scannedScenes.add(scene);
  }

  function patchHudPerFrame() {
    if (cachedFigures) patchFiguresInstance(cachedFigures);
    else if (cachedHudGeom) patchHudGeometry(cachedHudGeom);
  }


  function findWelcomeHost() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }
      if (typeof obj.setColor === 'function' && obj.game_modes) return obj;
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

  function findGameClient() {
    var host = findWelcomeHost();
    if (host && host.lI1IO) return host.lI1IO;

    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }
      if (obj.player_name !== undefined && obj.names && obj.Ol10l) return obj;
      if (obj.lI1IO && obj.lI1IO.Ol10l) return obj.lI1IO;
      if (obj.lI1IO && obj.lI1IO.player_name !== undefined && obj.lI1IO.names) return obj.lI1IO;
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 30; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
    return null;
  }

  function getPlayerName() {
    var client = findGameClient();
    if (client && client.player_name && String(client.player_name).trim()) {
      return String(client.player_name).trim();
    }

    var inp = document.querySelector('#player input') ||
      document.querySelector('.modal input[type="text"]');
    if (inp && inp.value && inp.value.trim()) return inp.value.trim();

    if (window.__sbDesktopPlayerName) return String(window.__sbDesktopPlayerName).trim();
    return '';
  }

  function normalizePlayerName(name) {
    return String(name || '').trim().toLowerCase();
  }

  function namesMatch(rowName, playerName) {
    var a = normalizePlayerName(rowName);
    var b = normalizePlayerName(playerName);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true;
    return a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
  }

  function syncPlayerName() {
    var name = getPlayerName();
    if (name) window.__sbDesktopPlayerName = name;
  }

  function isScoreboardCanvas(ctx) {
    var c = ctx && ctx.canvas;
    if (!c) return false;
    var ratio = c.width / Math.max(1, c.height);
    return c.width >= 120 && c.height >= 60 && ratio >= 0.45 && ratio <= 3.5;
  }

  function extractScoreRowName(text) {
    var str = String(text || '').trim();
    if (!str) return '';
    if (/^\d+[\.\):\-]\s*/.test(str)) {
      str = str.replace(/^\d+[\.\):\-]\s*/, '').trim();
    }
    return str.replace(/^\[[^\]]+\]\s*/, '').trim();
  }

  function isPlayerScoreText(text, ctx) {
    var name = getPlayerName();
    if (!name || name.length < 1) return false;
    var str = String(text).trim();
    if (!str) return false;

    var rowName = extractScoreRowName(str);
    if (rowName && namesMatch(rowName, name)) return true;

    if (ctx && isScoreboardCanvas(ctx)) {
      if (namesMatch(str, name)) return true;
      if (str.indexOf(name) >= 0) return true;
      if (rowName && rowName.indexOf(name) >= 0) return true;
    }

    return false;
  }

  function shouldDrawLeaderboardFx(ctx, text) {
    if (!getSettings().leaderboardNeon) return false;
    if (!ctx || !ctx.fillText) return false;
    syncPlayerName();
    return isPlayerScoreText(text, ctx);
  }

  function galaxySeed(w, h, accentHex) {
    var accent = hexToCss(accentHex || getLeaderboardAccent());
    var key = w + 'x' + h + ':' + accent;
    if (galaxyPatternCache[key]) return galaxyPatternCache[key];

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var g = canvas.getContext('2d');
    var n = hexToInt(accent);

    g.fillStyle = 'rgb(' +
      Math.max(0, Math.floor(((n >> 16) & 255) * 0.07)) + ',' +
      Math.max(0, Math.floor(((n >> 8) & 255) * 0.07)) + ',' +
      Math.max(0, Math.floor((n & 255) * 0.07)) + ')';
    g.fillRect(0, 0, w, h);

    var blobs = [
      { x: 0.12, y: 0.48, r: 0.58, hot: 25, a0: 0.88, a1: 0.40 },
      { x: 0.40, y: 0.42, r: 0.52, hot: 10, a0: 0.76, a1: 0.32 },
      { x: 0.70, y: 0.52, r: 0.48, hot: 18, a0: 0.70, a1: 0.28 },
      { x: 0.28, y: 0.62, r: 0.36, hot: 5, a0: 0.58, a1: 0.22 },
      { x: 0.55, y: 0.58, r: 0.30, hot: 35, a0: 0.48, a1: 0.18 }
    ];

    for (var b = 0; b < blobs.length; b++) {
      var blob = blobs[b];
      var bx = blob.x * w;
      var by = blob.y * h;
      var br = blob.r * w;
      var grad = g.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, rgbaFromHex(lightenHex(accent, blob.hot), blob.a0));
      grad.addColorStop(0.45, rgbaFromHex(accent, blob.a1));
      grad.addColorStop(1, rgbaFromHex(darkenHex(accent, 60), 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }

    var wash = g.createLinearGradient(0, 0, w, 0);
    wash.addColorStop(0, rgbaFromHex(accent, 0.22));
    wash.addColorStop(0.5, rgbaFromHex(accent, 0.10));
    wash.addColorStop(1, rgbaFromHex(accent, 0.22));
    g.fillStyle = wash;
    g.fillRect(0, 0, w, h);

    var starCount = Math.max(55, Math.floor(w * h / 650));
    for (var i = 0; i < starCount; i++) {
      var sx = ((i * 97 + 13) % 1000) / 1000 * w;
      var sy = ((i * 53 + 7) % 1000) / 1000 * h;
      var alpha = 0.35 + ((i * 31) % 65) / 100;
      var radius = 0.35 + ((i * 17) % 18) / 10;
      g.fillStyle = rgbaFromHex(lightenHex(accent, 85), alpha);
      g.beginPath();
      g.arc(sx, sy, radius, 0, Math.PI * 2);
      g.fill();
    }

    galaxyPatternCache[key] = canvas;
    return canvas;
  }

  function drawGalaxyRow(ctx, barTop, barH, origFillRect, accentHex) {
    var w = ctx.canvas.width;
    var h = Math.max(28, Math.ceil(barH));
    var accent = hexToCss(accentHex || getLeaderboardAccent());
    var pattern = galaxySeed(w, h, accent);
    var rowY = Math.max(0, barTop);
    var rowH = Math.max(18, barH);
    var pulse = neonPulse();

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 22 + pulse * 18;
    ctx.drawImage(pattern, 0, 0, w, h, 0, rowY, w, rowH);
    ctx.shadowBlur = 0;

    var edge = ctx.createLinearGradient(0, rowY, w, rowY);
    edge.addColorStop(0, rgbaFromHex(accent, 0.75 + pulse * 0.2));
    edge.addColorStop(0.12, rgbaFromHex(accent, 0.22));
    edge.addColorStop(0.88, rgbaFromHex(accent, 0.22));
    edge.addColorStop(1, rgbaFromHex(accent, 0.75 + pulse * 0.2));
    ctx.fillStyle = edge;
    origFillRect.call(ctx, 0, rowY, w, rowH);

    ctx.strokeStyle = rgbaFromHex(lightenHex(accent, 40), 0.65 + pulse * 0.25);
    ctx.lineWidth = 1.5;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12 + pulse * 10;
    ctx.strokeRect(0.5, rowY + 0.5, w - 1, rowH - 1);
    ctx.restore();
  }

  function drawLeaderboardNeonName(ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText) {
    if (!getSettings().leaderboardNeon) {
      return origFillText.call(ctx, text, x, y, maxWidth);
    }

    var canvasH = ctx.canvas && ctx.canvas.height ? ctx.canvas.height : 440;
    var rowH = canvasH / 11;
    var h = Math.max(16, rowH * 0.85);
    var pulse = neonPulse();
    var flash = neonFlash();
    var neon = getLeaderboardAccent();
    var neonCore = lightenHex(neon, 55);
    var neonHot = lightenHex(neon, 35);
    var neonBloom = lightenHex(neon, 85);
    var neonFlashColor = lightenHex(neon, 95);
    var darkFill = darkFillFromAccent(neon);
    var barTop;
    var barH;
    if (ctx.__sbPlayerRowRect) {
      barTop = ctx.__sbPlayerRowRect.y;
      barH = ctx.__sbPlayerRowRect.h;
    } else {
      barTop = y - rowH * 0.48;
      barH = rowH * 0.96;
    }

    var prev = {
      fill: ctx.fillStyle,
      stroke: ctx.strokeStyle,
      lineWidth: ctx.lineWidth,
      shadowBlur: ctx.shadowBlur,
      shadowColor: ctx.shadowColor,
      globalAlpha: ctx.globalAlpha,
      textAlign: ctx.textAlign,
      textBaseline: ctx.textBaseline
    };

    drawGalaxyRow(ctx, barTop, barH, origFillRect, neon);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.miterLimit = 2;
    ctx.textAlign = prev.textAlign || 'left';
    ctx.textBaseline = prev.textBaseline || 'middle';

    // Couche 1 — halo externe (flash LED)
    ctx.lineWidth = Math.max(12, h * 0.48) * (0.85 + pulse * 0.3);
    ctx.strokeStyle = rgbaFromHex(neon, 0.42 + pulse * 0.28);
    ctx.shadowColor = neon;
    ctx.shadowBlur = 72 + pulse * 48;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    // Couche 2 — glow moyen
    ctx.lineWidth = Math.max(8, h * 0.32) * flash;
    ctx.strokeStyle = rgbaFromHex(neonHot, 0.88);
    ctx.shadowColor = neonHot;
    ctx.shadowBlur = 48 + pulse * 28;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    // Couche 3 — contour vif
    ctx.lineWidth = Math.max(5, h * 0.18);
    ctx.strokeStyle = neonCore;
    ctx.shadowColor = neonBloom;
    ctx.shadowBlur = 28 + pulse * 16;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    // Couche 4 — trait blanc flash
    ctx.lineWidth = Math.max(2.2, h * 0.08);
    ctx.strokeStyle = neonFlashColor;
    ctx.shadowBlur = 14 + flash * 12;
    ctx.shadowColor = '#ffffff';
    origStrokeText.call(ctx, text, x, y, maxWidth);

    // Remplissage sombre à l'intérieur des lettres (style référence)
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = darkFill;
    var result = origFillText.call(ctx, text, x, y, maxWidth);

    ctx.fillStyle = prev.fill;
    ctx.strokeStyle = prev.stroke;
    ctx.lineWidth = prev.lineWidth;
    ctx.shadowBlur = prev.shadowBlur;
    ctx.shadowColor = prev.shadowColor;
    ctx.globalAlpha = prev.globalAlpha;
    ctx.textAlign = prev.textAlign;
    ctx.textBaseline = prev.textBaseline;
    return result;
  }

  function wrapScorePanelDraw(panel) {
    if (!panel || panel.__sbLbInstHooked || typeof panel.ll1OO !== 'function') return;

    var originalDraw = panel.ll1OO;
    panel.ll1OO = function (ctx) {
      if (!getSettings().leaderboardNeon || !ctx || !ctx.fillText) {
        return originalDraw.call(this, ctx);
      }

      var origFillText = ctx.fillText;
      var origFillRect = ctx.fillRect;
      var origStrokeText = ctx.strokeText;

      ctx.fillText = function (text, x, y, maxWidth) {
        if (shouldDrawLeaderboardFx(ctx, text)) {
          return drawLeaderboardNeonName(
            ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
          );
        }
        return origFillText.apply(ctx, arguments);
      };

      ctx.fillRect = function (rx, ry, rw, rh) {
        if (getSettings().leaderboardNeon && isScoreboardRowRect(ctx, rw, rh)) {
          ctx.__sbPlayerRowRect = { x: rx, y: ry, w: rw, h: rh };
        }
        return origFillRect.apply(ctx, arguments);
      };

      try {
        ctx.__sbScoreboardDraw = true;
        return originalDraw.call(this, ctx);
      } finally {
        ctx.fillText = origFillText;
        ctx.fillRect = origFillRect;
        ctx.__sbScoreboardDraw = false;
        ctx.__sbPlayerRowRect = null;
      }
    };
    panel.__sbLbInstHooked = true;
    scorePanelHooked = true;
  }

  function hookScorePanelPrototype() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (typeof obj === 'function' && obj.prototype &&
          typeof obj.prototype.ll1OO === 'function' &&
          typeof obj.prototype.updateScore === 'function' &&
          !obj.prototype.__sbLbProtoHooked) {
        var src = obj.prototype.ll1OO.toString();
        if (src.indexOf('getUint8(1)') >= 0 && (src.indexOf('player_name') >= 0 || src.indexOf('names.get') >= 0)) {
          var originalDraw = obj.prototype.ll1OO;
          obj.prototype.ll1OO = function (ctx) {
            if (!getSettings().leaderboardNeon || !ctx || !ctx.fillText) {
              return originalDraw.call(this, ctx);
            }

            var origFillText = ctx.fillText;
            var origFillRect = ctx.fillRect;
            var origStrokeText = ctx.strokeText;

            ctx.fillText = function (text, x, y, maxWidth) {
              if (shouldDrawLeaderboardFx(ctx, text)) {
                return drawLeaderboardNeonName(
                  ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
                );
              }
              return origFillText.apply(ctx, arguments);
            };

            ctx.fillRect = function (rx, ry, rw, rh) {
              if (getSettings().leaderboardNeon && isScoreboardRowRect(ctx, rw, rh)) {
                ctx.__sbPlayerRowRect = { x: rx, y: ry, w: rw, h: rh };
              }
              return origFillRect.apply(ctx, arguments);
            };

            try {
              ctx.__sbScoreboardDraw = true;
              return originalDraw.call(this, ctx);
            } finally {
              ctx.fillText = origFillText;
              ctx.fillRect = origFillRect;
              ctx.__sbScoreboardDraw = false;
              ctx.__sbPlayerRowRect = null;
            }
          };
          obj.prototype.__sbLbProtoHooked = true;
          window.__sbScoreProtoHooked = true;
          scorePanelHooked = true;
        }
      }

      if (typeof obj === 'function' && obj.prototype) stack.push(obj.prototype);
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 35; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
          if (typeof child === 'function') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
  }

  function hookScoreboardFromClient() {
    var client = findGameClient();
    if (!client || !client.display || !client.display.screen) return;

    var stack = [client.display.screen];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (typeof obj.ll1OO === 'function' && obj.view && obj.lI1IO) {
        wrapScorePanelDraw(obj);
      }

      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 40; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
  }

  function hookFiguresPrototype() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (typeof obj === 'function' && obj.prototype &&
          typeof obj.prototype.setBar === 'function' &&
          typeof obj.prototype.setBarColor === 'function' &&
          typeof obj.prototype.initBar === 'function' &&
          !obj.prototype.__sbFiguresProtoHooked) {
        var proto = obj.prototype;
        var origSetBar = proto.setBar;
        proto.setBar = function (start, value, max) {
          var out = origSetBar.apply(this, arguments);
          if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
            patchFiguresInstance(this);
          }
          return out;
        };
        var origSetBarColor = proto.setBarColor;
        proto.setBarColor = function (start, r, g, b) {
          var out = origSetBarColor.apply(this, arguments);
          if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
            patchFiguresInstance(this);
          }
          return out;
        };
        proto.__sbFiguresProtoHooked = true;
      }

      if (typeof obj === 'function' && obj.prototype) stack.push(obj.prototype);
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 35; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
          if (typeof child === 'function') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
  }

  function hookScorePanelDraw() {
    hookScoreboardFromClient();
    hookScorePanelPrototype();
    hookFiguresPrototype();
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (obj && typeof obj === 'object' &&
          obj.lI1IO && typeof obj.updateScore === 'function' &&
          typeof obj.ll1OO === 'function' && typeof obj.updateHue === 'function') {
        wrapScorePanelDraw(obj);
      }

      if (typeof obj === 'function' && obj.prototype &&
          typeof obj.prototype.updateHue === 'function' &&
          typeof obj.prototype.updateScore === 'function' &&
          typeof obj.prototype.ll1OO === 'function' &&
          !obj.prototype.__sbLbHooked) {

        var proto = obj.prototype;
        var originalDraw = proto.ll1OO;
        proto.ll1OO = function (ctx) {
          if (!getSettings().leaderboardNeon || !ctx || !ctx.fillText) {
            return originalDraw.call(this, ctx);
          }

          var origFillText = ctx.fillText;
          var origFillRect = ctx.fillRect;
          var origStrokeText = ctx.strokeText;

          ctx.fillText = function (text, x, y, maxWidth) {
            if (shouldDrawLeaderboardFx(ctx, text)) {
              return drawLeaderboardNeonName(
                ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
              );
            }
            return origFillText.apply(ctx, arguments);
          };

          ctx.fillRect = function (rx, ry, rw, rh) {
            if (getSettings().leaderboardNeon && isScoreboardRowRect(ctx, rw, rh)) {
              ctx.__sbPlayerRowRect = { x: rx, y: ry, w: rw, h: rh };
            }
            return origFillRect.apply(ctx, arguments);
          };

          try {
            ctx.__sbScoreboardDraw = true;
            return originalDraw.call(this, ctx);
          } finally {
            ctx.fillText = origFillText;
            ctx.fillRect = origFillRect;
            ctx.__sbScoreboardDraw = false;
            ctx.__sbPlayerRowRect = null;
          }
        };
        proto.__sbLbHooked = true;
        scorePanelHooked = true;
      }

      if (typeof obj === 'function' && obj.prototype) stack.push(obj.prototype);
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 35; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
          if (typeof child === 'function') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
  }

  function installCanvasHooks() {
    if (canvasHooksInstalled) return;
    canvasHooksInstalled = true;

    var origFillText = CanvasRenderingContext2D.prototype.fillText;
    var origFillRect = CanvasRenderingContext2D.prototype.fillRect;
    var origStrokeText = CanvasRenderingContext2D.prototype.strokeText;

    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (shouldDrawLeaderboardFx(this, text)) {
        return drawLeaderboardNeonName(
          this, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
        );
      }
      return origFillText.apply(this, arguments);
    };

    CanvasRenderingContext2D.prototype.fillRect = function (rx, ry, rw, rh) {
      if (getSettings().leaderboardNeon && isScoreboardRowRect(this, rw, rh) &&
          (this.__sbScoreboardDraw || isScoreboardCanvas(this))) {
        this.__sbPlayerRowRect = { x: rx, y: ry, w: rw, h: rh };
      }
      return origFillRect.apply(this, arguments);
    };
  }

  function installWheelFov() {
    if (wheelHookInstalled) return;
    wheelHookInstalled = true;
    liveFovMultiplier = getSettings().fovMultiplier || DEFAULTS.fovMultiplier;

    window.addEventListener('wheel', function (e) {
      if (!shouldApplyGameplayVisuals()) return;
      if (e.ctrlKey || e.metaKey) return;
      var delta = (e.deltaY || 0) > 0 ? -0.05 : 0.05;
      liveFovMultiplier = Math.max(0.85, Math.min(2.0, getFovMultiplier() + delta));
      var s = getSettings();
      s.fovMultiplier = liveFovMultiplier;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      window.__sbDesktopSettings = s;
      e.preventDefault();
    }, { passive: false, capture: true });
  }

  function applyRendererClearColor(renderer) {
    if (!renderer || !renderer.setClearColor) return;
    renderer.setClearColor(0x000000, 1);
  }

  function patchRendererInstance(renderer) {
    if (!renderer || typeof renderer.render !== 'function' || renderer.render.__sbWrapped) return;

    applyRendererClearColor(renderer);

    var originalRender = renderer.render;
    renderer.render = function (scene, camera) {
      hookScorePanelDraw();
      scanSceneOnce(scene);
      patchCamera(camera);
      refreshRadarPerFrame();
      patchHudPerFrame();
      refreshMeteoriteMaterials();
      refreshAsteroidMeshes();
      window.__sbLastCamera = camera;
      if (typeof window.__sbTintLocalShipInScene === 'function') {
        window.__sbTintLocalShipInScene(scene, camera);
      }
      var result = originalRender.call(this, scene, camera);
      refreshRadarPerFrame();
      patchHudPerFrame();
      return result;
    };
    renderer.render.__sbWrapped = true;
  }

  function wrapShaderMaterial(THREE) {
    var Original = THREE.ShaderMaterial;
    if (!Original || Original.__sbWrapped) return;

    function WrappedShader(params) {
      params = params || {};
      if (params.vertexShader && params.vertexShader.indexOf('l0111.xy') >= 0) {
        params.vertexShader = params.vertexShader.replace(
          /l0111\.xy \*= ([\d.]+)/,
          function (match, zoom) {
            var effective = parseFloat(zoom) / RADAR_DEZOOM;
            return 'l0111.xy *= ' + effective;
          }
        );
      }
      return new Original(params);
    }

    WrappedShader.prototype = Original.prototype;
    WrappedShader.__sbWrapped = true;
    THREE.ShaderMaterial = WrappedShader;
  }

  function wrapMaterialCtor(THREE, name) {
    var Original = THREE[name];
    if (!Original || Original.__sbWrapped) return;

    function Wrapped(params) {
      var mat = new Original(params || {});
      patchMaterial(mat);
      return mat;
    }

    Wrapped.prototype = Original.prototype;
    Wrapped.__sbWrapped = true;
    THREE[name] = Wrapped;
  }

  function wrapObject3DAdd(THREE) {
    if (!THREE.Object3D || THREE.Object3D.prototype.__sbAddWrapped) return;

    var originalAdd = THREE.Object3D.prototype.add;
    THREE.Object3D.prototype.add = function () {
      var obj = originalAdd.apply(this, arguments);
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i]) {
          patchObject(arguments[i]);
          if (arguments[i].traverse) arguments[i].traverse(patchObject);
        }
      }
      return obj;
    };
    THREE.Object3D.prototype.__sbAddWrapped = true;
  }

  function wrapRendererCtor(THREE) {
    var Original = THREE.WebGLRenderer;
    if (!Original || Original.__sbWrapped) return;

    function WrappedRenderer(params) {
      Original.apply(this, arguments);
      applyRendererClearColor(this);
      patchRendererInstance(this);
    }

    WrappedRenderer.prototype = Original.prototype;
    WrappedRenderer.__sbWrapped = true;
    THREE.WebGLRenderer = WrappedRenderer;
  }

  function threeReady(THREE) {
    return THREE && THREE.WebGLRenderer && THREE.MeshPhongMaterial && THREE.MeshLambertMaterial;
  }

  function installHooks(THREE) {
    if (!threeReady(THREE) || THREE.__sbDesktopHooked) return false;

    try {
      wrapMaterialCtor(THREE, 'MeshPhongMaterial');
      wrapMaterialCtor(THREE, 'MeshLambertMaterial');
      wrapShaderMaterial(THREE);
      wrapObject3DAdd(THREE);
      wrapRendererCtor(THREE);
      installCanvasHooks();
      installWheelFov();
      THREE.__sbDesktopHooked = true;
      return true;
    } catch (err) {
      return false;
    }
  }

  function bootstrap() {
    if (window.THREE) installHooks(window.THREE);
  }

  var storedThree = window.THREE;
  try {
    Object.defineProperty(window, 'THREE', {
      configurable: true,
      enumerable: true,
      get: function () { return storedThree; },
      set: function (v) {
        storedThree = v;
        setTimeout(bootstrap, 0);
      }
    });
  } catch (e) {
    // ignore
  }

  bootstrap();
  installCanvasHooks();
  installWheelFov();

  setInterval(function () {
    syncPlayerName();
    hookScorePanelDraw();
  }, 1000);

  document.addEventListener('input', function (e) {
    if (e.target && e.target.closest && e.target.closest('#player')) syncPlayerName();
  }, true);

  try {
    var nameInput = document.querySelector('#player input');
    if (nameInput) {
      nameInput.addEventListener('input', syncPlayerName);
      nameInput.addEventListener('change', syncPlayerName);
      syncPlayerName();
    }
  } catch (e) { /* ignore */ }

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    bootstrap();
    hookScorePanelDraw();
    if ((window.THREE && window.THREE.__sbDesktopHooked) || tries > 200) {
      clearInterval(timer);
    }
  }, 50);

  window.blockAdBlock = { on: function () {}, off: function () {}, setOption: function () {} };
})();
