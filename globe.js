/* Studio Mel · globe de l'accueil (three.js r128). Repris de la V1, affiché uniquement dans l'accueil. */
function initGlobe(){
  var c = document.getElementById('globe');
  if (!c || !window.THREE) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var COL = { dot: 0x2F5BFF, hi: 0xB4C6FF, line: 0x2F5BFF, glow: '47,91,255' };

  var LAND = [
    [[-168,66],[-162,70],[-140,70],[-120,72],[-95,72],[-80,73],[-62,60],[-55,52],[-66,45],[-70,42],[-76,35],[-81,31],[-80,25],[-82,28],[-84,30],[-90,29],[-97,26],[-97,20],[-92,18],[-87,21],[-88,15],[-83,9],[-78,8],[-80,7],[-86,12],[-92,14],[-105,20],[-110,24],[-112,31],[-117,33],[-122,37],[-124,42],[-124,48],[-130,55],[-140,59],[-152,58],[-158,56],[-165,60]],
    [[-73,78],[-60,82],[-30,83],[-20,75],[-22,70],[-42,60],[-50,64],[-55,70],[-70,76]],
    [[-78,8],[-72,12],[-62,10],[-52,5],[-35,-5],[-38,-13],[-40,-22],[-48,-26],[-53,-34],[-58,-38],[-65,-42],[-68,-50],[-70,-55],[-74,-50],[-73,-40],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0],[-77,4]],
    [[-10,36],[-9,43],[-2,44],[-5,48],[0,49],[5,53],[8,57],[10,54],[14,55],[20,55],[22,60],[25,65],[17,69],[25,71],[30,70],[40,67],[45,68],[60,70],[60,55],[50,45],[40,42],[30,41],[26,38],[23,36],[20,40],[15,38],[12,44],[8,44],[3,43],[-1,37],[-6,36]],
    [[5,58],[8,63],[14,68],[20,70],[28,71],[30,66],[24,64],[22,60],[18,59],[12,56]],
    [[-17,21],[-16,28],[-10,30],[-6,36],[10,37],[11,33],[20,31],[25,32],[32,31],[34,28],[38,20],[43,12],[51,12],[48,4],[41,-2],[40,-10],[40,-15],[35,-24],[33,-28],[27,-34],[20,-35],[18,-30],[15,-24],[12,-17],[13,-8],[9,-1],[9,4],[5,5],[-4,5],[-8,4],[-13,8],[-17,15]],
    [[26,38],[36,36],[35,32],[34,28],[43,13],[52,16],[57,22],[60,25],[67,25],[73,20],[77,8],[80,15],[88,22],[92,22],[98,16],[100,8],[103,1],[104,10],[109,12],[108,21],[117,23],[121,30],[122,37],[121,40],[128,35],[129,42],[135,44],[141,52],[137,55],[155,59],[162,62],[180,66],[180,72],[160,70],[140,73],[113,76],[100,78],[80,73],[68,70],[60,70],[45,68],[40,67],[60,55],[50,45],[40,42],[30,41]],
    [[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[145,-39],[138,-35],[131,-31],[115,-34]],
    [[130,31],[135,34],[140,36],[142,40],[141,45],[144,43],[140,38],[136,35],[131,33]],
    [[-5,50],[1,51],[2,53],[-1,55],[-3,58],[-6,58],[-5,55],[-3,54]],
    [[109,1],[117,7],[119,1],[117,-4],[110,-3]],
    [[95,5],[106,-6],[102,-4],[97,2]],
    [[132,-1],[141,-2],[150,-6],[147,-9],[138,-8],[134,-4]],
    [[44,-25],[47,-25],[50,-15],[49,-12],[44,-17]],
    [[172,-34],[178,-38],[174,-41],[167,-46],[172,-41]],
    [[-180,-70],[-120,-73],[-60,-64],[0,-70],[60,-67],[120,-66],[180,-70],[180,-90],[-180,-90]]
  ];
  function inPoly(x, y, p){
    var ins = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++){
      var xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }
  function isLand(lon, lat){ for (var k = 0; k < LAND.length; k++) if (inPoly(lon, lat, LAND[k])) return true; return false; }
  function vec(lon, lat, r){
    var phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  }
  function dotTex(){
    var d = document.createElement('canvas'); d.width = d.height = 64;
    var x = d.getContext('2d'), g = x.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.5,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0,0,64,64); return new THREE.CanvasTexture(d);
  }
  function glowTex(){
    var d = document.createElement('canvas'); d.width = d.height = 256;
    var x = d.getContext('2d'), g = x.createRadialGradient(128,128,60,128,128,128);
    g.addColorStop(0,'rgba(' + COL.glow + ',.55)'); g.addColorStop(.45,'rgba(' + COL.glow + ',.18)'); g.addColorStop(1,'rgba(' + COL.glow + ',0)');
    x.fillStyle = g; x.fillRect(0,0,256,256); return new THREE.CanvasTexture(d);
  }

  var mobile = innerWidth < 700;
  // appareils modestes : moins de points et une résolution plus basse
  var modeste = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  var r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, modeste ? 1.25 : mobile ? 1.75 : 2));
  var scene = new THREE.Scene();
  var cam = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  var DOT = dotTex();

  // étoiles
  var SN = mobile ? 700 : 1400, sp = new Float32Array(SN * 3);
  for (var i = 0; i < SN; i++){
    var v = new THREE.Vector3().randomDirection ? new THREE.Vector3().randomDirection() : new THREE.Vector3(Math.random()-.5, Math.random()-.5, Math.random()-.5).normalize();
    v.multiplyScalar(30 + Math.random() * 40);
    sp[i*3] = v.x; sp[i*3+1] = v.y; sp[i*3+2] = v.z;
  }
  var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  var stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: .16, map: DOT, color: 0xffffff, transparent: true, opacity: .55, depthWrite: false }));
  scene.add(stars);

  var world = new THREE.Group(); scene.add(world);
  world.rotation.z = 0.2; world.rotation.x = 0.25;
  var globe = new THREE.Group(); world.add(globe);

  // halo
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(3.3, 3.3, 1); halo.renderOrder = -1; scene.add(halo);

  // sphère occultante (cache les points de dos)
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(0.985, 48, 48), new THREE.MeshBasicMaterial({ color: 0x03050c })));

  // points des continents
  var N = modeste ? 9000 : mobile ? 14000 : 46000, lp = [], lc = [], cA = new THREE.Color(COL.dot), cB = new THREE.Color(COL.hi), tmp = new THREE.Color();
  var gold = Math.PI * (3 - Math.sqrt(5));
  for (var k = 0; k < N; k++){
    var y = 1 - (k / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), t = gold * k;
    var x = Math.cos(t) * rad, z = Math.sin(t) * rad;
    var lat = Math.asin(y) * 180 / Math.PI, lon = Math.atan2(z, -x) * 180 / Math.PI - 180;
    if (lon < -180) lon += 360;
    if (!isLand(lon, lat)) continue;
    var p = vec(lon, lat, 1);
    lp.push(p.x, p.y, p.z);
    tmp.copy(cA).lerp(cB, Math.random() * .6); lc.push(tmp.r, tmp.g, tmp.b);
  }
  var lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  var landMat = new THREE.PointsMaterial({ size: mobile ? .03 : .026, map: DOT, vertexColors: true, transparent: true, depthWrite: false });
  globe.add(new THREE.Points(lg, landMat));

  // treillis à facettes
  var lattice = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.06, 2)),
    new THREE.LineBasicMaterial({ color: COL.line, transparent: true, opacity: .1, depthWrite: false }));
  world.add(lattice);

  // arcs lumineux entre villes
  var CITIES = [[2.35,48.85],[-74,40.7],[139.7,35.7],[-0.1,51.5],[55.3,25.2],[103.8,1.35],[-46.6,-23.5],[151.2,-33.9],[-118.2,34],[77.2,28.6],[4.8,45.76],[-99.1,19.4],[18.4,-33.9],[37.6,55.75]];
  var arcs = [], SEG = 60;
  function makeArc(){
    var a = CITIES[Math.floor(Math.random() * CITIES.length)], b;
    do { b = CITIES[Math.floor(Math.random() * CITIES.length)]; } while (b === a);
    var A = vec(a[0], a[1], 1.005), B = vec(b[0], b[1], 1.005);
    var mid = A.clone().add(B).multiplyScalar(.5), h = 1 + A.distanceTo(B) * .35;
    mid.normalize().multiplyScalar(h);
    var curve = new THREE.QuadraticBezierCurve3(A, mid, B), pts = curve.getPoints(SEG);
    var g = new THREE.BufferGeometry().setFromPoints(pts); g.setDrawRange(0, 0);
    var m = new THREE.LineBasicMaterial({ color: COL.hi, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
    var line = new THREE.Line(g, m); globe.add(line);
    return { line: line, g: g, m: m, t: -Math.random() * 2 };
  }
  for (var q = 0; q < (mobile ? 4 : 7); q++) arcs.push(makeArc());

  // satellite
  var orbit = new THREE.Group(); orbit.rotation.x = 1.1; orbit.rotation.z = -0.35; world.add(orbit);
  var sat = new THREE.Group(); orbit.add(sat);
  sat.add(new THREE.Mesh(new THREE.BoxGeometry(.035, .035, .035), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  var panel = new THREE.Mesh(new THREE.BoxGeometry(.13, .004, .035), new THREE.MeshBasicMaterial({ color: COL.hi }));
  sat.add(panel);
  var sglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: COL.hi, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
  sglow.scale.set(.09, .09, 1); sat.add(sglow);
  var ringPts = []; for (var s = 0; s <= 128; s++){ var an = s / 128 * Math.PI * 2; ringPts.push(new THREE.Vector3(Math.cos(an) * 1.32, 0, Math.sin(an) * 1.32)); }
  orbit.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineBasicMaterial({ color: COL.line, transparent: true, opacity: .25, depthWrite: false })));

  var HOME = { s: 1, x: 0, y: -.6 }, PAGE = { s: 1, x: 0, y: 0 }, cur = null;
  function size(){
    // taille réelle du canvas affiché (corrige le globe ovale sur iPhone)
    var w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight, a = w / h, d, hH, hW;
    r.setSize(w, h, false); cam.aspect = a;
    if (w >= 900 && a >= 1.1) {
      // PC : grand demi-globe qui se lève depuis le bas de l'écran
      cam.fov = 22; d = 9;
      hH = d * Math.tan(11 * Math.PI / 180); hW = hH * a;
      var T = Math.min(hW * .9, hH * 1.75), R = T / Math.sqrt(1 + (T / d) * (T / d));
      HOME = { s: R, x: 0, y: -hH - R * .08 };
      PAGE = { s: hH * .62, x: hW * .64, y: -hH * .12 };
      landMat.size = .05;
    } else {
      // téléphone / tablette : globe entier
      cam.fov = 35; d = a < 1 ? 4.6 / Math.max(a, .72) : 4.6;
      hH = d * Math.tan(17.5 * Math.PI / 180); hW = hH * a;
      HOME = { s: 1, x: 0, y: a < 1 ? -0.95 : -0.6 };
      PAGE = { s: hW * .55, x: hW * .62, y: hH * .64 };
      landMat.size = mobile ? .03 : .026;
    }
    cam.position.set(0, 0, d);
    cam.updateProjectionMatrix();
    if (!cur) { var t0 = target(); cur = { s: t0.s, x: t0.x, y: t0.y }; place(); }
  }
  function target(){ return document.body.classList.contains('off') ? PAGE : HOME; }
  function place(){
    world.scale.setScalar(cur.s); world.position.set(cur.x, cur.y, 0);
    halo.scale.set(3.3 * cur.s, 3.3 * cur.s, 1); halo.position.set(cur.x, cur.y, 0);
  }
  // le globe suit légèrement la souris
  var mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('pointermove', function(e){ if (e.pointerType !== 'mouse') return; tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; });
  addEventListener('resize', size); size();

  var last = 0;
  function frame(now){
    var dt = Math.min((now - last) / 1000, .05) || 0; last = now;
    var t = now / 1000;
    globe.rotation.y -= dt * .09;
    lattice.rotation.y -= dt * .05;
    stars.rotation.y -= dt * .004;
    var ang = t * .45; sat.position.set(Math.cos(ang) * 1.32, 0, Math.sin(ang) * 1.32); sat.rotation.y = -ang;
    halo.material.opacity = .78 + Math.sin(t * 1.3) * .22;
    var T = target(), k = reduce ? 1 : 1 - Math.exp(-dt * 2.4);
    cur.s += (T.s - cur.s) * k; cur.x += (T.x - cur.x) * k; cur.y += (T.y - cur.y) * k; place();
    var km = 1 - Math.exp(-dt * 3); mx += (tx - mx) * km; my += (ty - my) * km;
    world.rotation.y = mx * .28; world.rotation.x = .25 + my * .1;
    for (var i = 0; i < arcs.length; i++){
      var a = arcs[i]; a.t += dt * .55;
      if (a.t < 0) { a.g.setDrawRange(0, 0); continue; }
      if (a.t <= 1) { a.g.setDrawRange(0, Math.floor(a.t * SEG) + 1); a.m.opacity = .9; }
      else if (a.t <= 1.8) { a.m.opacity = .9 * (1 - (a.t - 1) / .8); }
      else { globe.remove(a.line); a.g.dispose(); a.m.dispose(); arcs[i] = makeArc(); }
    }
    r.render(scene, cam);
  }
  if (reduce) { frame(0); c.classList.add('on'); var rf = function(){ frame(0); }; addEventListener('resize', rf); new MutationObserver(rf).observe(document.body, { attributes: true, attributeFilter: ['class'] }); return; }
  // le globe ne tourne que lorsqu'il est visible (onglet actif et accueil à l'écran)
  var docOn = !document.hidden, inView = true, running = false;
  function wake(){ if (!running && docOn && inView) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  document.addEventListener('visibilitychange', function(){ docOn = !document.hidden; wake(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function(e){ inView = e[0].isIntersecting; wake(); }, { threshold: 0 }).observe(c);
  function loop(now){
    if (!docOn || !inView) { running = false; return; }
    requestAnimationFrame(loop);
    frame(now);
  }
running = true; requestAnimationFrame(function(n){ last = n; loop(n); c.classList.add('on'); });
}
// three.js r128 (≈ 600 Ko, hébergé sur le site) ne se charge qu'après l'affichage de la page, au premier geste ou au bout de 3,5 s
// three.js est préchargé dès l'ouverture de l'accueil (balise preload) : la planète démarre tout de suite.
(function(){
  if (!document.getElementById('globe')) return;
  if (window.THREE) { initGlobe(); return; }
  var s = document.createElement('script'); s.src = '/three.r128.min.js'; s.onload = initGlobe; document.head.appendChild(s);
})();
