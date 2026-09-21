/* ============================================================================
   360 REALITY — 3D building  (Three.js r128, global build)
   ----------------------------------------------------------------------------
   A twisting glass tower with a small skyline around it that:
     • builds itself floor-by-floor once the preloader finishes
     • rotates as the page scrolls (plus a slow idle spin)
     • glides between positions / sizes / opacities defined per section with
         data-scene='{"x":2.4,"y":0,"scale":1,"opacity":1,"dolly":0}'
       – x / y  : where the city sits (scene units, + = right / up)
       – scale  : size multiplier
       – opacity: canvas opacity (fade the tower behind busy sections)
       – dolly  : move the camera closer (negative) or further (positive)
       Elements inside a pinned section ([data-pin]) can add data-at="0…1" so
       the keyframe is placed at that fraction of the section's scroll range.

   Colours come from SITE.colors, tunables from SITE.scene (assets/js/theme.js).
   ============================================================================ */
(function () {
  'use strict';

  // Tells main.js the scene is set up (or that it never will be) so the preloader can finish.
  function announce() { document.dispatchEvent(new CustomEvent('scene:ready')); }

  var canvas = document.getElementById('building-canvas');
  if (!canvas || typeof THREE === 'undefined') {
    document.documentElement.classList.add('no-webgl');
    announce();
    return;
  }

  var SITE = window.SITE || {};
  var C = SITE.colors || {};
  var B = C.brand || {};
  var opts = Object.assign({
    floors: 40, twistDegrees: 88, idleSpin: true, scrollSpin: 1,
    buildOnLoad: true, lightSweep: true, particles: true, mouseParallax: true
  }, SITE.scene || {});
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var isTouch = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);

  /* ---------- renderer / camera ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    document.documentElement.classList.add('no-webgl');
    announce();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
  var CAM = { x: 0, y: 0.3, z: 16.5, lookY: 0 };
  camera.position.set(CAM.x, CAM.y, CAM.z);
  camera.lookAt(0, CAM.lookY, 0);

  /* ---------- colours (from the theme) ---------- */
  var accent     = new THREE.Color(C.accent || '#3fe4ff');
  var bodyCol    = new THREE.Color(B[950] || '#0a1c4d');
  var capCol     = new THREE.Color(B[900] || '#123486').multiplyScalar(0.55);
  var surfaceCol = new THREE.Color(C.surface || '#08132b');
  var skyCol     = new THREE.Color(B[300] || '#86c2ff');
  var bgCol      = new THREE.Color(C.bg || '#030812');

  /* ---------- textures ---------- */
  var maxAniso = renderer.capabilities.getMaxAnisotropy();

  // A grid of lit / unlit windows, used as an emissive map so windows glow.
  function windowTexture(cols, rows, litRatio) {
    var cell = 32, w = cols * cell, h = rows * cell;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    var lit = '#' + accent.getHexString();
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var isLit = Math.random() < litRatio;
        ctx.globalAlpha = isLit ? 0.45 + Math.random() * 0.55 : 0.05 + Math.random() * 0.07;
        ctx.fillStyle = isLit ? (Math.random() < 0.18 ? '#ffffff' : lit) : '#9fd8ff';
        ctx.fillRect(x * cell + cell * 0.2, y * cell + cell * 0.24, cell * 0.6, cell * 0.52);
      }
    }
    ctx.globalAlpha = 1;
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = maxAniso;
    return tex;
  }

  // Soft radial gradient (white → transparent) for glows.
  function radialTexture() {
    var s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(cv);
  }

  function glassMaterial(tex, intensity) {
    return new THREE.MeshStandardMaterial({
      color: bodyCol, metalness: 0.6, roughness: 0.32,
      emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: intensity || 1
    });
  }
  var capMat = new THREE.MeshStandardMaterial({ color: capCol, metalness: 0.5, roughness: 0.6 });

  /* ---------- the city ---------- */
  var city = new THREE.Group();
  scene.add(city);

  // Main twisting tower: stacked floor slabs, each rotated a little more than the last.
  var F = Math.max(8, opts.floors | 0);
  var floorH = 0.14, gap = 0.026, W = 1.55, D = 0.98;
  var pitch = floorH + gap;
  var totalH = F * pitch;
  var baseY = -totalH / 2 - 0.3;
  var twistStep = THREE.MathUtils.degToRad(opts.twistDegrees) / F;

  var frontTex = [], sideTex = [];
  for (var v = 0; v < 6; v++) { frontTex.push(windowTexture(7, 1, 0.58)); sideTex.push(windowTexture(4, 1, 0.58)); }

  var tower = new THREE.Group();
  city.add(tower);
  var floorGeo = new THREE.BoxGeometry(W, floorH, D);
  var floors = [];
  for (var i = 0; i < F; i++) {
    var vi = (Math.random() * 6) | 0;
    var mF = glassMaterial(frontTex[vi], 1), mS = glassMaterial(sideTex[(vi + 1) % 6], 1);
    var mesh = new THREE.Mesh(floorGeo, [mS, mS, capMat, capMat, mF, mF]);
    var taper = 1 - (i / (F - 1)) * 0.2;
    mesh.userData = { taper: taper, rot: i * twistStep, y: baseY + i * pitch + floorH / 2, mats: [mF, mS] };
    mesh.scale.set(taper, 1, taper);
    mesh.position.y = mesh.userData.y;
    mesh.rotation.y = mesh.userData.rot;
    tower.add(mesh);
    floors.push(mesh);
  }
  var topY = baseY + F * pitch;
  var crown = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.78, 0.06, D * 0.78),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.4 })
  );
  crown.position.y = topY + 0.03; crown.rotation.y = F * twistStep; tower.add(crown);
  var spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.035, 1.3, 8),
    new THREE.MeshStandardMaterial({ color: '#dbe7ff', metalness: 0.85, roughness: 0.3 })
  );
  spire.position.y = topY + 0.65; tower.add(spire);
  var tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshBasicMaterial({ color: accent }));
  tip.position.y = topY + 1.32; tower.add(tip);
  var crownParts = [crown, spire, tip];

  // Neighbouring towers (stepped blocks) to make it read as a development.
  function blockTower(cfg) {
    var g = new THREE.Group();
    var y = baseY, cw = cfg.w, cd = cfg.d, ch = cfg.h, tiers = cfg.tiers || 1, shrink = cfg.shrink || 0.72;
    for (var k = 0; k < tiers; k++) {
      var cols = Math.max(2, Math.round(cw / 0.2)), colsD = Math.max(2, Math.round(cd / 0.2)), rows = Math.max(2, Math.round(ch / pitch));
      var mF = glassMaterial(windowTexture(cols, rows, 0.5), 0.85), mS = glassMaterial(windowTexture(colsD, rows, 0.5), 0.85);
      var m = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), [mS, mS, capMat, capMat, mF, mF]);
      m.position.y = y + ch / 2; g.add(m);
      y += ch; cw *= shrink; cd *= shrink; ch *= 0.6;
    }
    g.position.set(cfg.x, 0, cfg.z); g.rotation.y = cfg.rotY || 0;
    return g;
  }
  city.add(blockTower({ w: 1.05, h: 3.1,  d: 1.05, x: -2.05, z: -0.9,  tiers: 3, rotY: 0.3 }));
  city.add(blockTower({ w: 0.7,  h: 4.4,  d: 0.7,  x: 1.95,  z: -1.5,  tiers: 2, shrink: 0.6, rotY: -0.2 }));
  city.add(blockTower({ w: 1.7,  h: 1.25, d: 0.9,  x: 0.95,  z: 1.95,  tiers: 1, rotY: 0.15 }));
  city.add(blockTower({ w: 0.8,  h: 2.3,  d: 0.8,  x: -1.7,  z: 1.55,  tiers: 2, rotY: -0.4 }));

  // Plinth, glowing rings and a pool of light underneath.
  var plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.95, 0.16, 72),
    new THREE.MeshStandardMaterial({ color: surfaceCol, metalness: 0.4, roughness: 0.75 })
  );
  plinth.position.y = baseY - 0.08; city.add(plinth);
  var ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.78, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9 }));
  ring1.rotation.x = Math.PI / 2; ring1.position.y = baseY + 0.005; city.add(ring1);
  var ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.006, 8, 160), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.25 }));
  ring2.rotation.x = Math.PI / 2; ring2.position.y = baseY - 0.16; city.add(ring2);

  var glowTex = radialTexture();
  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({ map: glowTex, color: accent, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = baseY - 0.2; city.add(ground);

  var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: accent, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(15, 15, 1); scene.add(halo);

  // Floating light particles.
  var points = null, pSpeed = null;
  if (opts.particles) {
    var N = 240, pos = new Float32Array(N * 3); pSpeed = new Float32Array(N);
    for (var p = 0; p < N; p++) {
      pos[p * 3] = (Math.random() - 0.5) * 10;
      pos[p * 3 + 1] = baseY + Math.random() * 10;
      pos[p * 3 + 2] = (Math.random() - 0.5) * 7;
      pSpeed[p] = 0.08 + Math.random() * 0.22;
    }
    var pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: accent, size: 0.05, transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending }));
    city.add(points);
  }

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(skyCol, bgCol, 0.6));
  var key = new THREE.DirectionalLight('#ffffff', 1.1); key.position.set(6, 9, 7); scene.add(key);
  var rim = new THREE.DirectionalLight(accent, 0.9); rim.position.set(-7, 4, -5); scene.add(rim);
  var up = new THREE.PointLight(accent, 1.8, 14, 2); up.position.set(0, baseY - 0.2, 2.6); city.add(up);

  /* ---------- scroll keyframes from [data-scene] ---------- */
  var DEFAULT = { x: 0, y: 0, scale: 1, opacity: 1, dolly: 0 };
  var keys = [];

  function readKeys() {
    var sy = window.pageYOffset || 0, vh = window.innerHeight;
    keys = Array.prototype.map.call(document.querySelectorAll('[data-scene]'), function (el) {
      var val = {};
      try { val = JSON.parse(el.getAttribute('data-scene')) || {}; } catch (e) { val = {}; }
      var top, at = el.getAttribute('data-at');
      var pin = at != null && el.closest ? el.closest('[data-pin]') : null;
      if (pin) {
        var r = pin.getBoundingClientRect();
        top = r.top + sy + Math.max(0, r.height - vh) * parseFloat(at);
      } else {
        top = el.getBoundingClientRect().top + sy;
      }
      return { top: top, v: Object.assign({}, DEFAULT, val) };
    }).sort(function (a, b) { return a.top - b.top; });
  }

  function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }

  function sample(sy) {
    if (!keys.length) return DEFAULT;
    if (sy <= keys[0].top) return keys[0].v;
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (sy < b.top) {
        var span = Math.max(1, b.top - a.top), hold = span * 0.3;   // hold each state for 30% of the way
        var t = smooth((sy - a.top - hold) / (span - hold));
        return {
          x: mix(a.v.x, b.v.x, t), y: mix(a.v.y, b.v.y, t), scale: mix(a.v.scale, b.v.scale, t),
          opacity: mix(a.v.opacity, b.v.opacity, t), dolly: mix(a.v.dolly, b.v.dolly, t)
        };
      }
    }
    return keys[keys.length - 1].v;
  }

  /* ---------- state & loop ---------- */
  var cur = { x: 0, y: 0, scale: 1, opacity: 1, dolly: 0, rot: 0 };
  var scrollY = window.pageYOffset || 0;
  var mouse = { x: 0, y: 0 }, mouseCur = { x: 0, y: 0 };
  var clock = new THREE.Clock();
  var pageHidden = false;
  var introStart = null;                 // set when the preloader finishes
  var built = !opts.buildOnLoad || reduceMotion;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  if (!built) {
    // hide everything until the build animation starts
    for (var f0 = 0; f0 < floors.length; f0++) floors[f0].scale.y = 0.001;
    for (var c0 = 0; c0 < crownParts.length; c0++) crownParts[c0].scale.setScalar(0.001);
  }

  function frame() {
    requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    var narrow = window.innerWidth < 1024;

    // 1) where should the city be for this scroll position?
    var target = sample(scrollY);
    var tx = target.x, ty = target.y, ts = target.scale, to = target.opacity, td = target.dolly;
    if (narrow) { tx = 0; ty = target.y + 0.9; ts = target.scale * 0.72; to = target.opacity * 0.55; }

    var k = 1 - Math.exp(-dt * 4.5);
    cur.x += (tx - cur.x) * k; cur.y += (ty - cur.y) * k; cur.scale += (ts - cur.scale) * k;
    cur.opacity += (to - cur.opacity) * k; cur.dolly += (td - cur.dolly) * k;

    // 2) rotation: scroll-driven + slow idle spin
    var rotTarget = scrollY * 0.004 * opts.scrollSpin + ((opts.idleSpin && !reduceMotion) ? t * 0.12 : 0);
    cur.rot += (rotTarget - cur.rot) * (1 - Math.exp(-dt * 5));

    var bob = reduceMotion ? 0 : Math.sin(t * 0.7) * 0.06;
    city.position.set(cur.x, cur.y + bob, 0);
    city.scale.setScalar(cur.scale);
    city.rotation.y = cur.rot;
    halo.position.set(cur.x, cur.y + 0.4, -3.5);
    halo.scale.set(15 * cur.scale, 15 * cur.scale, 1);

    // 3) intro: the tower assembles floor by floor
    if (!built && introStart !== null) {
      var it = t - introStart, done = true;
      for (var i = 0; i < floors.length; i++) {
        var m = floors[i], u = m.userData;
        var pr = Math.min(1, Math.max(0, (it - i * 0.035) / 0.7));
        var e = easeOutCubic(pr);
        m.scale.set(u.taper * (0.6 + 0.4 * e), Math.max(0.001, e), u.taper * (0.6 + 0.4 * e));
        m.rotation.y = u.rot + (1 - e) * 1.4;
        m.position.y = u.y + (1 - e) * 0.5;
        if (pr < 1) done = false;
      }
      var pc = Math.min(1, Math.max(0, (it - floors.length * 0.035) / 0.6));
      var ec = easeOutCubic(pc);
      for (var c = 0; c < crownParts.length; c++) crownParts[c].scale.setScalar(Math.max(0.001, ec));
      if (done && pc >= 1) built = true;
    }

    // 4) pulse of light travelling up the tower
    if (opts.lightSweep && !reduceMotion) {
      var wave = ((t * 0.22) % 1.6) - 0.3;
      for (var j = 0; j < floors.length; j++) {
        var boost = Math.max(0, 1 - Math.abs(j / floors.length - wave) * 7);
        var inten = 0.95 + boost * 1.1;
        floors[j].userData.mats[0].emissiveIntensity = inten;
        floors[j].userData.mats[1].emissiveIntensity = inten;
      }
    }

    // 5) particles drift upward
    if (points && !reduceMotion) {
      var arr = points.geometry.attributes.position.array;
      for (var q = 0; q < pSpeed.length; q++) {
        arr[q * 3 + 1] += pSpeed[q] * dt;
        if (arr[q * 3 + 1] > baseY + 10) arr[q * 3 + 1] = baseY;
      }
      points.geometry.attributes.position.needsUpdate = true;
    }

    // 6) camera: mouse parallax + dolly
    if (opts.mouseParallax && !isTouch && !reduceMotion) {
      var km = 1 - Math.exp(-dt * 3);
      mouseCur.x += (mouse.x - mouseCur.x) * km;
      mouseCur.y += (mouse.y - mouseCur.y) * km;
    }
    camera.position.set(CAM.x + mouseCur.x * 0.9, CAM.y + mouseCur.y * 0.45, CAM.z + cur.dolly);
    camera.lookAt(0, CAM.lookY, 0);

    canvas.style.opacity = cur.opacity.toFixed(3);
    if (cur.opacity > 0.01 && !pageHidden) renderer.render(scene, camera);
  }

  /* ---------- events ---------- */
  document.addEventListener('visibilitychange', function () { pageHidden = document.hidden; });
  window.addEventListener('scroll', function () { scrollY = window.pageYOffset || 0; }, { passive: true });
  window.addEventListener('mousemove', function (e) {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  var resizeTimer;
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    readKeys();
  }
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(onResize, 120); });
  window.addEventListener('load', readKeys);
  if ('ResizeObserver' in window) new ResizeObserver(function () { readKeys(); }).observe(document.body);

  // main.js dispatches this when the preloader is done → start the build animation
  document.addEventListener('site:ready', function () { if (introStart === null) introStart = clock.elapsedTime; });
  setTimeout(function () { if (introStart === null) introStart = clock.elapsedTime; }, 3500);   // safety net

  readKeys();
  frame();
  announce();
})();
