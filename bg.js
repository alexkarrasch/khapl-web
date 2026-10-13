/* KHAPL hero water motion.
   Adds a light overlay to .water-backdrop: flow pulses run in along the traces,
   the pool answers with ripples, and the pointer leaves ripples on the water.
   Every effect is short and removes itself; nothing loops forever. Idle pulses
   only run while the hero is on screen and stop after a few cycles without input.
   Skipped entirely for prefers-reduced-motion. */
(function () {
  var host = document.querySelector('.water-backdrop');
  var base = host && host.querySelector('svg');
  var hero = host && host.closest('section') || document.body;
  if (!base || !window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NS = 'http://www.w3.org/2000/svg';
  var POOL = [1095, 430];
  var traces = [].map.call(base.querySelectorAll('.flow-traces path'), function (p) { return p.getAttribute('d'); });
  if (!traces.length) return;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function later(node, delay) {
    if (delay) [].forEach.call(node.children, function (c) { c.style.animationDelay = delay + 'ms'; });
    node.lastChild.addEventListener('animationend', function () { node.remove(); });
    return node;
  }

  var style = document.createElement('style');
  style.textContent =
    '.water-backdrop .wm{position:absolute;inset:0;z-index:1;width:100%;height:100%;pointer-events:none;overflow:hidden;will-change:transform}' +
    '.wm path{fill:none;stroke-linecap:round;stroke-dasharray:.1 2;stroke-dashoffset:-1;animation:wm-run 1.6s cubic-bezier(.5,0,.75,1) both}' +
    '.wm path:first-child{stroke:rgba(37,19,42,.28);stroke-width:7}' +
    '.wm path:last-child{stroke:#fff;stroke-width:2.6}' +
    '.wm ellipse{fill:none;vector-effect:non-scaling-stroke;transform-box:fill-box;transform-origin:center;animation:wm-ring 3.4s cubic-bezier(.15,.6,.3,1) both}' +
    '.wm ellipse:first-child{stroke:rgba(37,19,42,.3);stroke-width:2.4}' +
    '.wm ellipse:last-child{stroke:rgba(255,255,255,.85);stroke-width:1.2}' +
    '.wm .wide ellipse{animation-name:wm-wide;animation-duration:4.6s}' +
    '.wm .soft ellipse{animation-duration:2.4s}' +
    '@keyframes wm-run{0%{stroke-dashoffset:-1;opacity:0}15%,85%{opacity:1}100%{stroke-dashoffset:.1;opacity:0}}' +
    '@keyframes wm-ring{0%{transform:scale(.25);opacity:0}12%{opacity:1}100%{transform:scale(3.4);opacity:0}}' +
    '@keyframes wm-wide{0%{transform:scale(.4);opacity:0}10%{opacity:1}70%{opacity:.6}100%{transform:scale(8);opacity:0}}';
  document.head.appendChild(style);

  var svg = el('svg', {
    'class': 'wm', 'aria-hidden': 'true', focusable: 'false',
    viewBox: base.getAttribute('viewBox'),
    preserveAspectRatio: base.getAttribute('preserveAspectRatio')
  });
  var layer = el('g', { 'clip-path': 'url(#water-plane)' }, svg);
  host.appendChild(svg);

  function pulse(d, delay) {
    var g = el('g', {}, layer);
    el('path', { d: d, pathLength: 1 }, g);
    el('path', { d: d, pathLength: 1 }, g);
    return later(g, delay);
  }
  function ripple(x, y, size, delay, kind) {
    if (layer.childElementCount > 12) return;
    var g = el('g', kind ? { 'class': kind } : {}, layer);
    var a = { cx: x, cy: y, rx: 58 * size, ry: 32 * size };
    el('ellipse', a, g);
    el('ellipse', a, g);
    return later(g, delay);
  }

  /* opening: all traces feed the pool, then the pool ripples out */
  setTimeout(function () {
    traces.forEach(function (d, i) { pulse(d, i * 160); });
    [0, 600, 1200].forEach(function (t) { ripple(POOL[0], POOL[1], 1, 1500 + t, 'wide'); });
  }, 1700);

  /* idle: an occasional single inflow while the hero is visible, capped without input */
  var MAX = 6, visible = true, quiet = 0;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(host);
  }
  function idle() {
    if (visible && !document.hidden) {
      quiet++;
      pulse(traces[Math.floor(Math.random() * traces.length)], 0);
      ripple(POOL[0], POOL[1], .8, 1500, 'wide');
    }
    if (quiet < MAX) setTimeout(idle, 11000 + Math.random() * 6000);
  }
  setTimeout(idle, 14000);

  /* pointer: ripples where the cursor or finger touches the water */
  var last = 0, lx = 0, ly = 0;
  function touch(e) {
    var now = e.timeStamp || Date.now();
    var dx = e.clientX - lx, dy = e.clientY - ly;
    if (e.type === 'pointermove' && (e.pointerType !== 'mouse' || now - last < 380 || dx * dx + dy * dy < 1600)) return;
    var m = svg.getScreenCTM();
    if (!m) return;
    var p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    p = p.matrixTransform(m.inverse());
    last = now; lx = e.clientX; ly = e.clientY;
    ripple(p.x, p.y, e.type === 'pointermove' ? .45 : .7, 0, 'soft');
    if (quiet >= MAX) setTimeout(idle, 9000);
    quiet = 0;
  }
  hero.addEventListener('pointermove', touch, { passive: true });
  hero.addEventListener('pointerdown', touch, { passive: true });
})();
