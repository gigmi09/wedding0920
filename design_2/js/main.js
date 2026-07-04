const GAS_URL = 'https://script.google.com/macros/s/AKfycbz5LfGwbJUzHkthjqyvy0_85e2E1jQDUuirDwjshJnkZvuCJcHfRqhTRetYlWh-HjI/exec';

// Fade in on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Form submit
document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const result = document.getElementById('formResult');
  const form = e.target;

  btn.disabled = true;
  btn.textContent = '送信中...';
  result.style.display = 'none';

  const data = {
    attendance: form.attendance.value,
    lastName:   form.lastName.value,
    firstName:  form.firstName.value,
    guest:      form.guest.value,
    contact:    form.contact.value,
    allergy:    form.allergy.value,
    message:    form.message.value,
  };

  try {
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data),
    });
    result.className = 'form-result success';
    result.textContent = 'ご回答ありがとうございます。\nご来臨を心よりお待ちしております。';
    result.style.display = 'block';
    form.reset();
  } catch {
    result.className = 'form-result error';
    result.textContent = '送信に失敗しました。時間をおいて再度お試しください。';
    result.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'SEND';
  }
});

// ── COLORFUL CONFETTI ──────────────────────────
(function initConfetti() {
  const container = document.getElementById('heroStars');
  if (!container) return;
  const COLORS = ['#ff4f9d', '#ff7a4d', '#ffc22e', '#1fc8c2', '#37a9ff', '#a641e0'];
  const COUNT = 44;
  const frag = document.createDocumentFragment();
  // weighted mix ≈ star 5 : circle 4 : mickey 1
  const TYPES = ['c-star', 'c-star', 'c-star', 'c-star', 'c-star',
                 'c-circle', 'c-circle', 'c-circle', 'c-circle', 'c-mickey'];
  for (let i = 0; i < COUNT; i++) {
    const c = document.createElement('span');
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    c.className = `star ${type}`;
    const size = Math.random() * 10 + 8;
    c.style.width = `${size}px`;
    c.style.height = `${size}px`;
    c.style.left = `${Math.random() * 100}%`;
    c.style.top = `${Math.random() * 100}%`;
    c.style.setProperty('--c', COLORS[Math.floor(Math.random() * COLORS.length)]);
    c.style.setProperty('--dur', `${4 + Math.random() * 4}s`);
    c.style.setProperty('--delay', `${Math.random() * 4}s`);
    frag.appendChild(c);
  }
  container.appendChild(frag);
})();

// ── RISING BALLOONS (infinite loop) ────────────
(function initBalloons() {
  const container = document.getElementById('heroBalloons');
  if (!container) return;
  const COLORS = ['#ff4f9d', '#ff7a4d', '#ffc22e', '#1fc8c2', '#37a9ff', '#a641e0'];
  const COUNT = 6;

  function addEars(b) {
    const earL = document.createElement('span');
    earL.className = 'ear ear-l';
    const earR = document.createElement('span');
    earR.className = 'ear ear-r';
    b.append(earL, earR);
  }

  // re-roll a balloon's colour, position and shape (called each rise)
  function roll(b, forceMickey) {
    b.style.setProperty('--x', `${Math.random() * 92}%`);
    b.style.setProperty('--c', COLORS[Math.floor(Math.random() * COLORS.length)]);
    b.querySelectorAll('.ear').forEach(e => e.remove());
    b.classList.remove('balloon-mickey');
    if (forceMickey || Math.random() < 0.15) {
      b.classList.add('balloon-mickey');
      addEars(b);
    }
  }

  const frag = document.createDocumentFragment();
  for (let i = 0; i < COUNT; i++) {
    const b = document.createElement('span');
    b.className = 'balloon';
    const size = Math.random() * 28 + 28;            // 28–56px
    const dur = Math.random() * 10 + 13;             // 13–23s (sparser)
    b.style.setProperty('--bw', `${size}px`);
    b.style.setProperty('--dur', `${dur}s`);
    b.style.setProperty('--delay', `${-Math.random() * dur}s`); // stagger + already mid-flight
    roll(b, i === 0);                                 // first one starts as a Mickey
    b.addEventListener('animationiteration', () => roll(b)); // re-roll each loop
    frag.appendChild(b);
  }
  container.appendChild(frag);
})();

// ── HEADING: draw-on + sparkle ─────────────────
(function initHeadings() {
  const labels = [...document.querySelectorAll('.section-label')];
  if (!('IntersectionObserver' in window)) {
    labels.forEach(l => l.classList.add('drawn', 'done'));
    return;
  }

  const DRAW_MS = 1400; // must match the labelDraw animation duration

  // wrap each heading's text in an inner span (gradient text), measure its
  // natural width, then hide it up-front so it can be "written" on scroll
  labels.forEach(l => {
    const span = document.createElement('span');
    span.className = 'label-inner';
    span.textContent = l.textContent.trim();
    l.textContent = '';
    l.appendChild(span);
    const w = span.getBoundingClientRect().width;
    l.style.setProperty('--w', `${Math.ceil(w) + 6}px`);
    l.classList.add('will-draw');
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const label = entry.target;
      label.classList.add('drawn');
      setTimeout(() => {
        label.classList.add('done');
        spawnSparkles(label);
      }, DRAW_MS);
      obs.unobserve(label);
    });
  }, { threshold: 0.7 });

  labels.forEach(l => obs.observe(l));

  function spawnSparkles(label) {
    const N = 7;
    for (let i = 0; i < N; i++) {
      const s = document.createElement('span');
      s.className = 'label-sparkle';
      s.textContent = '✦';
      s.style.left = `${5 + Math.random() * 90}%`;
      s.style.top = `${-10 + Math.random() * 120}%`;
      s.style.fontSize = `${8 + Math.random() * 12}px`;
      s.style.setProperty('--sd', `${Math.random() * 0.5}s`);
      label.appendChild(s);
      setTimeout(() => s.remove(), 1800);
    }
  }
})();

// ── FLOWER SYSTEM ──────────────────────────────
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function buildFlower({ petalColor, innerColor, centerColor, width = 80, delay = 0 }) {
  const svg = svgEl('svg', { viewBox: '0 0 100 100', width, height: width });
  svg.classList.add('flower-svg');
  svg.style.overflow = 'visible';
  svg.style.transitionDelay = `${delay}s`;

  const root = svgEl('g', { transform: 'translate(50,50)' });

  // Outer petals (5)
  for (let i = 0; i < 5; i++) {
    const g = svgEl('g', { transform: `rotate(${i * 72})` });
    g.appendChild(svgEl('ellipse', { cx: 0, cy: -24, rx: 11, ry: 19, fill: petalColor }));
    root.appendChild(g);
  }

  // Inner petals (5, offset 36°)
  for (let i = 0; i < 5; i++) {
    const g = svgEl('g', { transform: `rotate(${i * 72 + 36})` });
    g.appendChild(svgEl('ellipse', { cx: 0, cy: -15, rx: 7, ry: 11, fill: innerColor }));
    root.appendChild(g);
  }

  // Center + stamen dots
  root.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 7, fill: centerColor }));
  [[0,-9],[7,-5],[-7,-5],[4,5],[-4,5]].forEach(([cx, cy]) => {
    root.appendChild(svgEl('circle', { cx, cy, r: 1.8, fill: '#fff', opacity: 0.9 }));
  });

  svg.appendChild(root);
  return svg;
}

// rainbow of flowers that opens in sequence over each heading
(function initFlowerRainbows() {
  const RAINBOW = [
    { p: '#ff5b6a', i: '#ff9aa4' },
    { p: '#ff9e3d', i: '#ffc285' },
    { p: '#ffd23d', i: '#ffe595' },
    { p: '#5bd06a', i: '#9be0a4' },
    { p: '#4aa8ff', i: '#9bcdff' },
    { p: '#6a6ae0', i: '#a6a6ef' },
    { p: '#a24bd6', i: '#c99be6' },
  ];
  const CENTER = '#ffcf3f';
  const N = RAINBOW.length;
  const SIZE = 34;
  const AMP = 42; // arc height (edges drop this far below the peak)

  const labels = [...document.querySelectorAll('.section-label')];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const section = entry.target.closest('.section-wrap');
      if (section) {
        section.querySelectorAll('.flower-svg').forEach(svg => svg.classList.add('bloomed'));
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  labels.forEach(label => {
    const section = label.closest('.section-wrap');
    if (!section) return;

    const arc = document.createElement('div');
    arc.className = 'flower-arc';

    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);                       // 0 → 1 across the arc
      const topPx = (1 - Math.sin(Math.PI * t)) * AMP; // peak in the middle
      const wrapper = document.createElement('div');
      wrapper.className = 'flower-wrapper';
      wrapper.style.left = `${t * 100}%`;
      wrapper.style.top = `${topPx}px`;
      wrapper.appendChild(buildFlower({
        petalColor: RAINBOW[i].p,
        innerColor: RAINBOW[i].i,
        centerColor: CENTER,
        width: SIZE,
        delay: i * 0.13,                           // open left → right
      }));
      arc.appendChild(wrapper);
    }

    section.appendChild(arc);
    observer.observe(label);
  });
})();
