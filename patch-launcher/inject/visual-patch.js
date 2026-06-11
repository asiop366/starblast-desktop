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
    leaderboardColor: '#ff69b4',
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
      if (raw != null) {
        var parsed = JSON.parse(raw);
        if (parsed !== null && parsed !== undefined) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return fallback;
  }

  function readLauncherColor(exp, key, fallback) {
    var fromStore = readSbParam(key, undefined);
    if (fromStore !== undefined) return String(fromStore);
    try {
      var v = exp.check(key);
      if (v && typeof v === 'string' && v.charAt(0) === '#') return String(v);
      if (v && typeof v === 'string' && v.indexOf('#') >= 0) return String(v);
    } catch (e) {
      // ignore
    }
    return fallback;
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

  function rgbaFromHex(hex, alpha) {
    var n = hexToInt(hex);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function neonRgbFromHex(hex) {
    var rgb = hexToRgb01(hexToInt(hex));
    return [
      Math.min(1, rgb[0] * 1.15 + 0.35),
      Math.min(1, rgb[1] * 1.15 + 0.35),
      Math.min(1, rgb[2] * 1.15 + 0.35)
    ];
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
    sharedMaterialScanDone = false;
    scorePanelHooked = false;
    refreshGemMaterials();
    if (cachedFigures) patchFiguresInstance(cachedFigures);
    else if (cachedHudGeom) patchHudGeometry(cachedHudGeom);
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

  function applyHudBarNeon(geom, figures, startIndex, enabled, fillHex) {
    if (!enabled) return;

    var colors = geom.attributes.color.array;
    var opac = geom.attributes.opac && geom.attributes.opac.array;
    var sizes = geom.attributes.Ol11I && geom.attributes.Ol11I.array;
    var glowRgb = neonRgbFromHex(fillHex);
    var hotRgb = [
      Math.min(1, glowRgb[0] + 0.18),
      Math.min(1, glowRgb[1] + 0.18),
      Math.min(1, glowRgb[2] + 0.18)
    ];
    var end = startIndex + HUD_DISPLAY_SIZE;

    for (var i = startIndex; i < end; i++) {
      var fig = figures[i];
      if (fig === 16) {
        colors[3 * i] = hotRgb[0];
        colors[3 * i + 1] = hotRgb[1];
        colors[3 * i + 2] = hotRgb[2];
        if (opac) opac[i] = 1;
        if (sizes) sizes[i] = 0.038;
      } else if (fig === 0) {
        colors[3 * i] = glowRgb[0] * 0.12;
        colors[3 * i + 1] = glowRgb[1] * 0.12;
        colors[3 * i + 2] = glowRgb[2] * 0.12;
        if (opac) opac[i] = 0.85;
      } else if (fig === 11) {
        colors[3 * i] = 1;
        colors[3 * i + 1] = 1;
        colors[3 * i + 2] = 1;
        if (sizes) sizes[i] = Math.max(sizes[i] || 0.02, 0.028);
      } else if (fig > 0 && fig !== 16) {
        colors[3 * i] = Math.min(1, glowRgb[0] * 0.55 + 0.25);
        colors[3 * i + 1] = Math.min(1, glowRgb[1] * 0.55 + 0.25);
        colors[3 * i + 2] = Math.min(1, glowRgb[2] * 0.55 + 0.25);
      }
    }
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
    if (!fig || fig.__sbBarHooked || typeof fig.setBarColor !== 'function') return;

    var originalSetBarColor = fig.setBarColor;
    fig.setBarColor = function (start, r, g, b) {
      var out = originalSetBarColor.apply(this, arguments);
      if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
        patchFiguresInstance(this);
      }
      return out;
    };
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

    if (fig.geometry && isHudGeometry(fig.geometry)) {
      applyHudBarNeon(fig.geometry, fig.figure, fig.crystal_index, s.gemBarNeon !== false, s.gemColor);
      applyHudBarNeon(fig.geometry, fig.figure, fig.generator_index, s.energyBarNeon !== false, s.energyColor);
      applyHudBarNeon(fig.geometry, fig.figure, fig.shield_index, s.shieldBarNeon !== false, s.shieldColor);
      var colAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('color');
      if (colAttr) colAttr.needsUpdate = true;
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


  function findGameClient() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }
      if (obj.lI1IO && obj.lI1IO.player_name) return obj.lI1IO;
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
    if (client && client.player_name) return String(client.player_name).trim();
    if (window.__sbDesktopPlayerName) return String(window.__sbDesktopPlayerName).trim();
    var inp = document.querySelector('#player input');
    if (inp && inp.value) return inp.value.trim();
    try {
      var stored = localStorage.getItem('lIlO1');
      if (stored) return String(stored).trim();
    } catch (e) { /* ignore */ }
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

  function isPlayerScoreText(text) {
    var name = getPlayerName();
    if (!name || name.length < 1) return false;
    var str = String(text).trim();
    if (!/^\d+\.\s+/.test(str)) return false;
    var rowName = str.replace(/^\d+\.\s+/, '').trim();
    return namesMatch(rowName, name);
  }

  function galaxySeed(w, h) {
    var key = w + 'x' + h;
    if (galaxyPatternCache[key]) return galaxyPatternCache[key];

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var g = canvas.getContext('2d');

    g.fillStyle = '#080012';
    g.fillRect(0, 0, w, h);

    var blobs = [
      { x: 0.18 * w, y: 0.52 * h, r: 0.42 * w, inner: 'rgba(220,30,160,0.7)', outer: 'rgba(40,0,60,0)' },
      { x: 0.52 * w, y: 0.48 * h, r: 0.48 * w, inner: 'rgba(120,20,200,0.65)', outer: 'rgba(20,0,40,0)' },
      { x: 0.82 * w, y: 0.5 * h, r: 0.36 * w, inner: 'rgba(255,60,180,0.45)', outer: 'rgba(30,0,50,0)' },
      { x: 0.35 * w, y: 0.62 * h, r: 0.28 * w, inner: 'rgba(90,0,140,0.5)', outer: 'rgba(0,0,0,0)' }
    ];

    for (var b = 0; b < blobs.length; b++) {
      var blob = blobs[b];
      var grad = g.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      grad.addColorStop(0, blob.inner);
      grad.addColorStop(0.55, 'rgba(80,0,120,0.25)');
      grad.addColorStop(1, blob.outer);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }

    var starCount = Math.max(40, Math.floor(w * h / 900));
    for (var i = 0; i < starCount; i++) {
      var sx = ((i * 97 + 13) % 1000) / 1000 * w;
      var sy = ((i * 53 + 7) % 1000) / 1000 * h;
      var alpha = 0.25 + ((i * 31) % 70) / 100;
      var radius = 0.4 + ((i * 17) % 15) / 10;
      g.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      g.beginPath();
      g.arc(sx, sy, radius, 0, Math.PI * 2);
      g.fill();
    }

    galaxyPatternCache[key] = canvas;
    return canvas;
  }

  function drawGalaxyRow(ctx, barTop, barH, origFillRect, accentHex) {
    var w = ctx.canvas.width;
    var h = Math.max(24, Math.ceil(barH));
    var pattern = galaxySeed(w, h);
    var accent = hexToCss(accentHex || DEFAULTS.leaderboardColor);

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(pattern, 0, 0, w, h, 0, barTop + 2, w, barH - 4);

    var edge = ctx.createLinearGradient(0, barTop, w, barTop);
    edge.addColorStop(0, rgbaFromHex(accent, 0.35));
    edge.addColorStop(0.5, rgbaFromHex(accent, 0.2));
    edge.addColorStop(1, rgbaFromHex(accent, 0.35));
    ctx.fillStyle = edge;
    origFillRect.call(ctx, 0, barTop + 2, w, barH - 4);
    ctx.restore();
  }

  function drawLeaderboardNeonName(ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText) {
    var s = getSettings();
    var canvasH = ctx.canvas && ctx.canvas.height ? ctx.canvas.height : 440;
    var rowH = canvasH / 11;
    var h = Math.max(16, rowH * 0.85);
    var neon = hexToCss(s.leaderboardColor || DEFAULTS.leaderboardColor);
    var neonHot = lightenHex(neon, 20);
    var neonSoft = lightenHex(neon, 80);
    var darkFill = '#0c0018';
    var barTop = y - rowH * 0.48;
    var barH = rowH * 0.96;

    var prev = {
      fill: ctx.fillStyle,
      stroke: ctx.strokeStyle,
      lineWidth: ctx.lineWidth,
      shadowBlur: ctx.shadowBlur,
      shadowColor: ctx.shadowColor,
      globalAlpha: ctx.globalAlpha,
      textAlign: ctx.textAlign
    };

    drawGalaxyRow(ctx, barTop, barH, origFillRect, neon);

    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.textAlign = prev.textAlign || 'left';

    ctx.lineWidth = Math.max(6, h * 0.2);
    ctx.strokeStyle = neonHot;
    ctx.shadowColor = neon;
    ctx.shadowBlur = 38;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    ctx.lineWidth = Math.max(3.5, h * 0.12);
    ctx.strokeStyle = neonSoft;
    ctx.shadowBlur = 22;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    ctx.lineWidth = Math.max(1.8, h * 0.06);
    ctx.strokeStyle = neon;
    ctx.shadowBlur = 14;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    ctx.shadowBlur = 0;
    ctx.fillStyle = darkFill;
    var result = origFillText.call(ctx, text, x, y, maxWidth);

    ctx.fillStyle = prev.fill;
    ctx.strokeStyle = prev.stroke;
    ctx.lineWidth = prev.lineWidth;
    ctx.shadowBlur = prev.shadowBlur;
    ctx.shadowColor = prev.shadowColor;
    ctx.globalAlpha = prev.globalAlpha;
    ctx.textAlign = prev.textAlign;
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
        syncPlayerName();
        if (isPlayerScoreText(text)) {
          return drawLeaderboardNeonName(
            ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
          );
        }
        return origFillText.apply(ctx, arguments);
      };

      try {
        return originalDraw.call(this, ctx);
      } finally {
        ctx.fillText = origFillText;
      }
    };
    panel.__sbLbInstHooked = true;
    scorePanelHooked = true;
  }

  function hookScorePanelPrototype() {
    if (window.__sbScoreProtoHooked) return;
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
        if (src.indexOf('getUint8(1)') >= 0 && src.indexOf('player_name') >= 0) {
          var originalDraw = obj.prototype.ll1OO;
          obj.prototype.ll1OO = function (ctx) {
            if (!getSettings().leaderboardNeon || !ctx || !ctx.fillText) {
              return originalDraw.call(this, ctx);
            }

            var origFillText = ctx.fillText;
            var origFillRect = ctx.fillRect;
            var origStrokeText = ctx.strokeText;

            ctx.fillText = function (text, x, y, maxWidth) {
              syncPlayerName();
              if (isPlayerScoreText(text)) {
                return drawLeaderboardNeonName(
                  ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
                );
              }
              return origFillText.apply(ctx, arguments);
            };

            try {
              return originalDraw.call(this, ctx);
            } finally {
              ctx.fillText = origFillText;
            }
          };
          obj.prototype.__sbLbProtoHooked = true;
          window.__sbScoreProtoHooked = true;
          scorePanelHooked = true;
          return;
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

  function hookScorePanelDraw() {
    hookScorePanelPrototype();
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
            syncPlayerName();
            if (isPlayerScoreText(text)) {
              return drawLeaderboardNeonName(
                ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
              );
            }
            return origFillText.apply(ctx, arguments);
          };

          try {
            return originalDraw.call(this, ctx);
          } finally {
            ctx.fillText = origFillText;
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
      if (getSettings().leaderboardNeon && isScoreboardCanvas(this) && isPlayerScoreText(text)) {
        syncPlayerName();
        return drawLeaderboardNeonName(
          this, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
        );
      }
      return origFillText.apply(this, arguments);
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
