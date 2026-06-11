/**
 * Fullscreen display — window resize patch only (no custom background).
 */
(function () {
  'use strict';

  if (window.__SB_DESKTOP_LAUNCHER_PATCH) return;
  if (window.__sbDesktopDisplayFix) return;
  window.__sbDesktopDisplayFix = true;

  function applyCanvasStyle() {
    if (document.getElementById('sb-desktop-canvas-style')) return;

    var style = document.createElement('style');
    style.id = 'sb-desktop-canvas-style';
    style.textContent =
      'html,body{margin:0!important;padding:0!important;overflow:hidden!important;width:100%!important;height:100%!important;background:#000!important}' +
      '#content,#home,#home_mobile,#overlay{background:transparent!important}' +
      'canvas{position:fixed!important;top:0!important;left:0!important;' +
      'width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;' +
      'display:block!important;touch-action:none}';

    var oldWallpaper = document.getElementById('sb-desktop-wallpaper');
    if (oldWallpaper) oldWallpaper.remove();

    document.documentElement.appendChild(style);
  }

  function patchDisplayResize() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (obj.O10ll && typeof obj.resize === 'function' && !obj.__sbResizePatched) {
        obj.resize = function () {
          this.width = window.innerWidth;
          this.height = window.innerHeight;
          this.rotated = this.width < this.height;
          this.O10ll.setSize(this.width, this.height);
          if (this.screen && this.screen.setSize) {
            this.screen.setSize(this.width, this.height, this.llO0I);
          }
          this.fixed = false;
        };
        obj.__sbResizePatched = true;
        obj.resize();
        return true;
      }

      var keys;
      try {
        keys = Object.keys(obj);
      } catch (e) {
        continue;
      }

      for (var i = 0; i < keys.length && i < 50; i++) {
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

    return false;
  }

  applyCanvasStyle();
  patchDisplayResize();

  window.addEventListener('resize', patchDisplayResize);

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    if (patchDisplayResize() || tries > 160) clearInterval(timer);
  }, 250);
})();
