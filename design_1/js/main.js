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

const FLOWER_CONFIGS = [
  {
    sectionIdx: 0, // Invitation
    flowers: [
      { wrapStyle: 'top:18px;right:16px', petalColor:'#a8c4a6', innerColor:'#c8dcc7', centerColor:'#c9a96e', width:78, delay:0 },
      { wrapStyle: 'top:72px;right:78px', petalColor:'#c4d9c3', innerColor:'#daebd9', centerColor:'#d4b87e', width:48, delay:0.3 },
    ],
  },
  {
    sectionIdx: 1, // Date & Venue
    flowers: [
      { wrapStyle: 'top:18px;left:16px', petalColor:'#b0c8ae', innerColor:'#ccdccb', centerColor:'#c9a96e', width:74, delay:0 },
      { wrapStyle: 'top:68px;left:72px', petalColor:'#c4d4c2', innerColor:'#d8e8d7', centerColor:'#d4b87e', width:46, delay:0.3 },
    ],
  },
  {
    sectionIdx: 2, // Profile
    flowers: [
      { wrapStyle: 'top:18px;right:16px', petalColor:'#a8c4a6', innerColor:'#c4d8c3', centerColor:'#c9a96e', width:75, delay:0 },
      { wrapStyle: 'top:68px;right:75px', petalColor:'#bcd0bb', innerColor:'#d0e4cf', centerColor:'#d4b87e', width:46, delay:0.3 },
    ],
  },
  {
    sectionIdx: 3, // Information → 左
    flowers: [
      { wrapStyle: 'top:18px;left:16px', petalColor:'#9cbf9a', innerColor:'#bcd4bb', centerColor:'#c9a96e', width:72, delay:0 },
      { wrapStyle: 'top:65px;left:68px', petalColor:'#b8ceb7', innerColor:'#d0e0cf', centerColor:'#d4b87e', width:45, delay:0.3 },
    ],
  },
  {
    sectionIdx: 4, // Access → 右
    flowers: [
      { wrapStyle: 'top:18px;right:16px', petalColor:'#a8c4a6', innerColor:'#c8dcc7', centerColor:'#c9a96e', width:74, delay:0 },
      { wrapStyle: 'top:68px;right:74px', petalColor:'#c4d9c3', innerColor:'#daebd9', centerColor:'#d4b87e', width:46, delay:0.3 },
    ],
  },
];

(function initFlowers() {
  const sections = [...document.querySelectorAll('.section-wrap')];

  const flowerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.flower-svg').forEach(svg => svg.classList.add('bloomed'));
      flowerObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  FLOWER_CONFIGS.forEach(({ sectionIdx, flowers }) => {
    const section = sections[sectionIdx];
    if (!section) return;

    const scene = document.createElement('div');
    scene.className = 'flower-scene';

    flowers.forEach(({ wrapStyle, delay, ...opts }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'flower-wrapper';
      wrapper.style.cssText = wrapStyle;
      wrapper.appendChild(buildFlower({ ...opts, delay }));
      scene.appendChild(wrapper);
    });

    section.appendChild(scene);
    flowerObserver.observe(section);
  });
})();
