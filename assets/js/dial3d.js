/* ============================================================================
   360 REALTY — 3D dial  (Three.js r128, global build)
   ----------------------------------------------------------------------------
   The 360° dial from the brand document, built as a real 3D object:
     • an outer tick ring (72 ticks, the six at 60° crossing the ring)
     • an inner ring with six community dots (Downtown is teal, the rest gold)
     • a faint globe inside, and a radar-style sweep that lights up each
       community in turn
     • it assembles itself once the preloader finishes, turns slowly on its own
       and with the page scroll, and tilts towards the cursor
   The community names, bearings and the "360°" centre are HTML (#dial-labels)
   so they stay crisp and follow the dark / light theme; this file positions
   them over the 3D points every frame.

   Where the dial sits is set per section with
     data-scene='{"x":2.4,"y":0,"scale":1,"opacity":1,"dolly":0}'
       – x / y  : position in scene units (+ = right / up)
       – anchor : instead of x / y, a CSS selector — the dial is centred on
                  that element (used by the hero: "#dial-anchor")
       – scale  : size multiplier
       – opacity: canvas opacity (fade the dial behind busy sections)
       – dolly  : move the camera closer (negative) or further (positive)

   Colours come from the CSS variables written by theme.js and are re-read
   whenever the theme toggles (document event "theme:change").
   Tunables: SITE.dial in assets/js/theme.js.
   ============================================================================ */
(function () {
  'use strict';

  // Tells main.js the scene is set up (or that it never will be) so the preloader can finish.
  function announce() { document.dispatchEvent(new CustomEvent('scene:ready')); }

  var canvas = document.getElementById('dial-canvas');
  var labelRoot = document.getElementById('dial-labels');
  if (!canvas || typeof THREE === 'undefined') {
    document.documentElement.classList.add('no-webgl');
    announce();
    return;
  }

  var SITE = window.SITE || {};
  var opts = Object.assign({
    idleSpin: true, scrollSpin: 1, sweep: true, globe: true, buildOnLoad: true, mouseParallax: true,
    tiltX: -0.62, tiltY: 0.26
  }, SITE.dial || {});
  var respectRM = !!(SITE.motion && SITE.motion.respectReducedMotion);
  var reduceMotion = respectRM && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
  var CAM = { x: 0, y: 0.25, z: 16.5 };
  camera.position.set(CAM.x, CAM.y, CAM.z);
  camera.lookAt(0, 0, 0);

  /* ---------- colours (read from the CSS variables, so they follow the theme) ---------- */
  var col = {};
  function cssColor(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var c;
    if (v && /^\d+\s+\d+\s+\d+$/.test(v)) {              // "r g b" form
      var p = v.split(/\s+/).map(Number);
      c = new THREE.Color(p[0] / 255, p[1] / 255, p[2] / 255);
    } else {
      c = new THREE.Color(v || fallback);
    }
    return c.convertSRGBToLinear();                     // so the rendered colour matches the CSS one
  }
  function readColors() {
    col.accent  = cssColor('--accent',  '#3db5ae');
    col.gold    = cssColor('--gold',    '#d6b27a');
    col.ink     = cssColor('--ink',     '#f1f4f1');
    col.muted   = cssColor('--muted',   '#8da2a5');
    col.surface = cssColor('--surface', '#15303a');
    col.light   = document.documentElement.getAttribute('data-theme') === 'light';
  }
  readColors();

  /* ---------- textures ---------- */
  // Soft radial gradient (white → transparent) for the dot glows.
  function radialTexture() {
    var s = 128, cv = document.createElement('canvas'); cv.width = cv.height = s;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(cv);
  }
  // A wedge that fades out behind its leading edge (the radar sweep).
  function sweepTexture() {
    var s = 512, cv = document.createElement('canvas'); cv.width = cv.height = s;
    var ctx = cv.getContext('2d');
    var c = s / 2, R = s / 2, N = 56, span = Math.PI * 0.42;
    for (var k = 0; k < N; k++) {
      var a0 = -(k / N) * span, a1 = -((k + 1) / N) * span - 0.004;
      ctx.beginPath(); ctx.moveTo(c, c);
      ctx.arc(c, c, R, -Math.PI / 2 + a0, -Math.PI / 2 + a1, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,' + (Math.pow(1 - k / N, 1.7) * 0.9).toFixed(3) + ')';
      ctx.fill();
    }
    return new THREE.CanvasTexture(cv);
  }
  var glowTex = radialTexture(), sweepTex = sweepTexture();

  /* ---------- materials ---------- */
  var mats = {
    ringOuter: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    ringInner: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    tickMajor: new THREE.MeshBasicMaterial({ transparent: true }),
    tickMid:   new THREE.MeshBasicMaterial({ transparent: true }),
    tickMinor: new THREE.MeshBasicMaterial({ transparent: true }),
    disc:      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    globe:     new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }),
    needle:    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    sweep:     new THREE.MeshBasicMaterial({ map: sweepTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    dotAccent: new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.2, emissiveIntensity: 1.1 }),
    dotGold:   new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.2, emissiveIntensity: 1.1 }),
    glowAccent: new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }),
    glowGold:   new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }),
    shadow:     new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false })   // soft shadow (light) / glow (dark) under the dial
  };
  var baseOpacity = {};   // target opacity per material (the build animation multiplies these)
  var FADE_MATS = ['ringOuter', 'ringInner', 'disc', 'globe', 'sweep', 'needle', 'shadow'];

  function applyColors() {
    var light = col.light;
    mats.ringOuter.color.copy(col.muted); mats.ringInner.color.copy(col.muted);
    mats.tickMajor.color.copy(col.ink); mats.tickMid.color.copy(col.ink); mats.tickMinor.color.copy(col.ink);
    mats.disc.color.copy(col.surface);
    mats.globe.color.copy(col.accent);
    mats.needle.color.copy(col.accent); mats.sweep.color.copy(col.accent);
    mats.dotAccent.color.copy(col.accent); mats.dotAccent.emissive.copy(col.accent);
    mats.dotGold.color.copy(col.gold);     mats.dotGold.emissive.copy(col.gold);
    mats.glowAccent.color.copy(col.accent); mats.glowGold.color.copy(col.gold);

    // Additive blending glows on a dark page but disappears on a light one.
    var blend = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    [mats.needle, mats.sweep, mats.glowAccent, mats.glowGold, mats.shadow].forEach(function (m) { m.blending = blend; m.needsUpdate = true; });
    // light: a soft dark shadow lifts the dial off the page · dark: a teal glow behind it
    if (light) mats.shadow.color.setRGB(0, 0, 0); else mats.shadow.color.copy(col.accent);

    baseOpacity.ringOuter = light ? 0.6 : 0.55;
    baseOpacity.ringInner = light ? 0.5 : 0.45;
    baseOpacity.tickMajor = light ? 0.9 : 0.95;
    baseOpacity.tickMid   = light ? 0.6 : 0.55;
    baseOpacity.tickMinor = light ? 0.38 : 0.28;
    baseOpacity.disc      = light ? 0.82 : 0.32;
    baseOpacity.globe     = light ? 0.18 : 0.09;
    baseOpacity.needle    = light ? 0.85 : 0.9;
    baseOpacity.sweep     = light ? 0.28 : 0.55;
    baseOpacity.glowAccent = light ? 0.4 : 0.55;
    baseOpacity.glowGold   = light ? 0.35 : 0.45;
    baseOpacity.shadow     = light ? 0.16 : 0.14;
    Object.keys(baseOpacity).forEach(function (k) { mats[k].opacity = baseOpacity[k]; });
  }
  applyColors();

  /* ---------- the dial ---------- */
  var tiltGroup = new THREE.Group();   // tilt + position
  var dial = new THREE.Group();        // spins around its own axis
  tiltGroup.add(dial); scene.add(tiltGroup);
  var R_OUT = 3.0, R_IN = 2.45;
  function bearingToRad(deg) { return THREE.MathUtils.degToRad(deg); }

  dial.add(new THREE.Mesh(new THREE.TorusGeometry(R_OUT, 0.016, 8, 220), mats.ringOuter));
  dial.add(new THREE.Mesh(new THREE.TorusGeometry(R_IN, 0.011, 8, 220), mats.ringInner));
  var disc = new THREE.Mesh(new THREE.CircleGeometry(R_IN - 0.02, 96), mats.disc);
  disc.position.z = -0.03; dial.add(disc);
  var shadow = new THREE.Sprite(mats.shadow);
  shadow.position.set(0.25, -0.45, -0.7); shadow.scale.set(R_OUT * 2.9, R_OUT * 2.4, 1);
  tiltGroup.add(shadow);

  // ticks every 5°, bigger every 30°, biggest (crossing the ring) every 60°
  var ticks = [];
  var geoMajor = new THREE.BoxGeometry(0.03, 0.46, 0.03);
  var geoMid   = new THREE.BoxGeometry(0.02, 0.26, 0.02);
  var geoMinor = new THREE.BoxGeometry(0.014, 0.14, 0.014);
  for (var i = 0; i < 72; i++) {
    var deg = i * 5, major = i % 12 === 0, mid = !major && i % 6 === 0;
    var geo = major ? geoMajor : mid ? geoMid : geoMinor;
    var mat = major ? mats.tickMajor : mid ? mats.tickMid : mats.tickMinor;
    var len = geo.parameters.height;
    var holder = new THREE.Group();
    holder.rotation.z = -bearingToRad(deg);                       // bearings run clockwise from the top
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = major ? R_OUT - len / 2 + 0.14 : R_OUT - len / 2 - 0.07;
    holder.add(mesh); dial.add(holder);
    ticks.push(mesh);
  }

  // six community dots on the inner ring + the anchors the HTML labels follow
  var dots = [];
  var dotGeo = new THREE.SphereGeometry(0.085, 20, 20);
  var labelEls = labelRoot ? Array.prototype.slice.call(labelRoot.querySelectorAll('.dial-label')) : [];
  for (var d = 0; d < 6; d++) {
    var th = bearingToRad(d * 60), sx = Math.sin(th), cy = Math.cos(th);
    var g = new THREE.Group(); g.position.set(R_IN * sx, R_IN * cy, 0.02);
    var sphere = new THREE.Mesh(dotGeo, d === 0 ? mats.dotAccent : mats.dotGold);
    var glow = new THREE.Sprite(d === 0 ? mats.glowAccent : mats.glowGold);
    glow.scale.set(0.9, 0.9, 1);
    g.add(sphere); g.add(glow); dial.add(g);
    var anchor = new THREE.Object3D();
    anchor.position.set((R_IN - 0.86) * sx, (R_IN - 0.86) * cy, 0.05);
    dial.add(anchor);
    dots.push({ group: g, sphere: sphere, glow: glow, anchor: anchor, deg: d * 60, pulse: 0, el: labelEls[d] || null });
  }
  var centerAnchor = new THREE.Object3D(); centerAnchor.position.set(0, 0, 0.06); dial.add(centerAnchor);
  var centerEl = labelRoot ? labelRoot.querySelector('.dial-center') : null;

  // faint globe: 5 parallels + 8 meridians
  var globe = null;
  if (opts.globe) {
    globe = new THREE.Group();
    var GR = 1.72;
    function circleLine(radius) {
      var pts = [];
      for (var k = 0; k <= 96; k++) { var a = (k / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)); }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mats.globe);
    }
    [-60, -30, 0, 30, 60].forEach(function (lat) {
      var r = Math.cos(THREE.MathUtils.degToRad(lat)) * GR, line = circleLine(r);
      line.rotation.x = Math.PI / 2; line.position.y = Math.sin(THREE.MathUtils.degToRad(lat)) * GR;
      globe.add(line);
    });
    for (var m = 0; m < 8; m++) { var mer = circleLine(GR); mer.rotation.y = (m / 8) * Math.PI; globe.add(mer); }
    globe.rotation.x = 0.35;
    dial.add(globe);
  }

  // radar sweep: wedge texture + thin needle, rotating clockwise
  var sweepGroup = new THREE.Group(); dial.add(sweepGroup);
  var sweepMesh = new THREE.Mesh(new THREE.PlaneGeometry(R_IN * 2, R_IN * 2), mats.sweep);
  sweepMesh.position.z = -0.01; sweepGroup.add(sweepMesh);
  var needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, R_IN, 0.012), mats.needle);
  needle.position.y = R_IN / 2; sweepGroup.add(needle);
  sweepGroup.visible = !!opts.sweep;

  /* ---------- lights (only the dots use a lit material) ---------- */
  scene.add(new THREE.HemisphereLight('#ffffff', '#223344', 0.9));
  var key = new THREE.DirectionalLight('#ffffff', 0.8); key.position.set(4, 6, 8); scene.add(key);

  /* ---------- scroll keyframes from [data-scene] ---------- */
  var DEFAULT = { x: 0, y: 0, scale: 1, opacity: 1, dolly: 0 };
  var keys = [];

  function halfHeightAtOrigin() { return Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * CAM.z; }

  function readKeys() {
    var sy = window.pageYOffset || 0, vh = window.innerHeight, vw = window.innerWidth;
    keys = Array.prototype.map.call(document.querySelectorAll('[data-scene]'), function (el) {
      var val = {};
      try { val = JSON.parse(el.getAttribute('data-scene')) || {}; } catch (e) { val = {}; }
      var top = el.getBoundingClientRect().top + sy;
      var v = Object.assign({}, DEFAULT, val);
      if (val.anchor) {
        // centre the dial on that element, as seen when this section is at the top of the viewport
        var a = document.querySelector(val.anchor), r = a ? a.getBoundingClientRect() : null;
        if (r && r.width > 0 && r.height > 0) {
          var cx = r.left + r.width / 2, cyDoc = r.top + sy + r.height / 2 - top;
          var ndx = (cx / vw) * 2 - 1, ndy = 1 - (cyDoc / vh) * 2;
          var hh = halfHeightAtOrigin();
          v.x = ndx * hh * camera.aspect; v.y = ndy * hh;
        } else {
          v.x = 0; v.y = 0;
        }
      }
      return { top: top, v: v };
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
  var introStart = null;                       // set when the preloader finishes
  var built = !opts.buildOnLoad || reduceMotion;
  var sweepAngle = 0;
  var activeIndex = -1;
  var labelsShown = false;
  var vec = new THREE.Vector3(), wp = new THREE.Vector3();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  if (!built) {
    for (var t0 = 0; t0 < ticks.length; t0++) ticks[t0].scale.y = 0.001;
    for (var d0 = 0; d0 < dots.length; d0++) dots[d0].group.scale.setScalar(0.001);
    FADE_MATS.forEach(function (k) { mats[k].opacity = 0; });
  }

  function placeLabel(el, obj, boost) {
    if (!el) return;
    wp.setFromMatrixPosition(obj.matrixWorld);
    vec.copy(wp).project(camera);
    var x = (vec.x + 1) / 2 * window.innerWidth, y = (1 - vec.y) / 2 * window.innerHeight;
    var s = CAM.z / Math.max(1, wp.distanceTo(camera.position));          // nearer = slightly bigger
    s = Math.min(1.25, Math.max(0.75, s)) * (boost || 1);
    if (!isFinite(x) || !isFinite(y) || !isFinite(s)) return;
    el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + s.toFixed(3) + ')';
    el.style.opacity = (0.55 + Math.min(1, Math.max(0, (s - 0.8) / 0.4)) * 0.45).toFixed(2);
  }

  var sizedW = 0, sizedH = 0;   // what the renderer / camera were last set up for

  function frame() {
    requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    // A tab opened in the background can start at 0 × 0 and never fire "resize" in time,
    // so re-fit the renderer and camera whenever the viewport actually changes.
    if (window.innerWidth !== sizedW || window.innerHeight !== sizedH) onResize();
    if (!sizedW || !sizedH) return;
    var narrow = window.innerWidth < 1024;

    // 1) where should the dial be for this scroll position?
    var target = sample(scrollY);
    var tx = target.x, ty = target.y, ts = target.scale, to = target.opacity, td = target.dolly;
    if (narrow) { tx = 0; ty = target.y + 0.9; ts = target.scale * 0.62; to = target.opacity * 0.22; }

    var k = 1 - Math.exp(-dt * 4.5);
    cur.x += (tx - cur.x) * k; cur.y += (ty - cur.y) * k; cur.scale += (ts - cur.scale) * k;
    cur.opacity += (to - cur.opacity) * k; cur.dolly += (td - cur.dolly) * k;

    // 2) rotation: scroll-driven + slow idle spin (clockwise)
    var rotTarget = -(scrollY * 0.0012 * opts.scrollSpin) - ((opts.idleSpin && !reduceMotion) ? t * (Math.PI * 2 / 150) : 0);
    cur.rot += (rotTarget - cur.rot) * (1 - Math.exp(-dt * 5));
    dial.rotation.z = cur.rot;

    var bob = reduceMotion ? 0 : Math.sin(t * 0.6) * 0.05;
    tiltGroup.position.set(cur.x, cur.y + bob, 0);
    tiltGroup.scale.setScalar(cur.scale);

    // 3) tilt + mouse parallax
    if (opts.mouseParallax && !isTouch && !reduceMotion) {
      var km = 1 - Math.exp(-dt * 3);
      mouseCur.x += (mouse.x - mouseCur.x) * km;
      mouseCur.y += (mouse.y - mouseCur.y) * km;
    }
    tiltGroup.rotation.x = opts.tiltX - mouseCur.y * 0.12;
    tiltGroup.rotation.y = opts.tiltY + mouseCur.x * 0.18;

    // 4) radar sweep + the community it is passing
    if (opts.sweep && !reduceMotion) sweepAngle += dt * (Math.PI * 2 / 16);
    sweepGroup.rotation.z = -sweepAngle;
    var sweepDeg = (THREE.MathUtils.radToDeg(sweepAngle) % 360 + 360) % 360;
    var best = -1, bestDiff = 999;
    for (var di = 0; di < dots.length; di++) {
      var diff = (sweepDeg - dots[di].deg + 360) % 360;
      dots[di].pulse = diff < 28 ? 1 - diff / 28 : 0;
      if (diff < 28 && diff < bestDiff) { bestDiff = diff; best = di; }
    }
    if (best !== activeIndex) {
      activeIndex = best;
      for (var li = 0; li < dots.length; li++) if (dots[li].el) dots[li].el.classList.toggle('is-active', li === best);
    }
    for (var pi = 0; pi < dots.length; pi++) {
      var p = dots[pi].pulse;
      dots[pi].sphere.scale.setScalar(1 + p * 0.6);
      dots[pi].glow.scale.set(0.9 + p * 1.4, 0.9 + p * 1.4, 1);
    }

    // 5) globe turns slowly
    if (globe && !reduceMotion) globe.rotation.y += dt * 0.12;

    // 6) intro: ticks sweep in clockwise, rings fade up, dots pop
    if (!built && introStart !== null) {
      var it = t - introStart, done = true;
      for (var ti = 0; ti < ticks.length; ti++) {
        var pr = Math.min(1, Math.max(0, (it - ti * 0.012) / 0.45));
        ticks[ti].scale.y = Math.max(0.001, easeOutCubic(pr));
        if (pr < 1) done = false;
      }
      var rp = easeOutCubic(Math.min(1, Math.max(0, it / 1.1)));
      FADE_MATS.forEach(function (key) { mats[key].opacity = baseOpacity[key] * rp; });
      for (var dj = 0; dj < dots.length; dj++) {
        var dp = easeOutCubic(Math.min(1, Math.max(0, (it - 0.9 - dj * 0.08) / 0.5)));
        dots[dj].group.scale.setScalar(Math.max(0.001, dp * (1 + 0.6 * (1 - dp))));   // tiny overshoot
        if (dp < 1) done = false;
      }
      if (done && rp >= 1) built = true;
    }

    // 7) camera: dolly
    camera.position.set(CAM.x, CAM.y, CAM.z + cur.dolly);
    camera.lookAt(0, 0, 0);

    // 8) draw + place the HTML labels
    canvas.style.opacity = cur.opacity.toFixed(3);
    var showLabels = built && cur.opacity > 0.55 && !narrow && scrollY < window.innerHeight * 0.45;   // hero only
    if (showLabels !== labelsShown && labelRoot) { labelsShown = showLabels; labelRoot.style.opacity = showLabels ? '1' : '0'; }
    if (cur.opacity > 0.01 && !pageHidden) {
      renderer.render(scene, camera);
      if (showLabels) {
        for (var la = 0; la < dots.length; la++) placeLabel(dots[la].el, dots[la].anchor);
        placeLabel(centerEl, centerAnchor);
      }
    }
  }

  /* ---------- events ---------- */
  document.addEventListener('visibilitychange', function () { pageHidden = document.hidden; });
  window.addEventListener('scroll', function () { scrollY = window.pageYOffset || 0; }, { passive: true });
  window.addEventListener('mousemove', function (e) {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  document.addEventListener('theme:change', function () { readColors(); applyColors(); if (!built) FADE_MATS.forEach(function (k) { mats[k].opacity = 0; }); });

  var resizeTimer;
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) { sizedW = sizedH = 0; return; }          // hidden / zero-sized: wait for a real size
    sizedW = w; sizedH = h;
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
