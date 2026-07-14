const CATEGORY_ICONS = {
  'data-selling': '🛒',
  'data-sharing': '🛒',
  'tracking': '👁',
  'arbitration': '⚖️',
  'auto-renewal': '🔄',
  'content-rights': '📝',
  'liability-waiver': '🛡',
  'termination': '🚪',
  'data-retention': '🗃',
  'jurisdiction': '📍',
  'financial': '💰',
  'privacy': '🔒',
  'biometric': '🧬',
  'marketing': '📢',
  'debt': '💳',
  'default': '⚠️'
};

function getCategoryIcon(cat) {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (cat.includes(key)) return icon;
  }
  return CATEGORY_ICONS.default;
}

function getCategoryClass(cat) {
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (cat.includes(key)) return `cat-${key}`;
  }
  return 'cat-default';
}

function getScoreColor(score) {
  if (score <= 30) return 'var(--safe)';
  if (score <= 50) return 'var(--medium)';
  if (score <= 75) return 'var(--high)';
  return 'var(--danger)';
}

function getGradeColor(grade) {
  const map = { A: 'var(--safe)', B: '#2dd4bf', C: 'var(--medium)', D: 'var(--high)', F: 'var(--danger)' };
  return map[grade] || map.C;
}

export function renderReport(data, onLearnMore) {
  renderRiskHero(data);
  renderGrades(data.grades);
  renderTraps(data.traps, onLearnMore);
  renderGoodClauses(data.goodClauses);
  renderComparisons(data.comparisons);

  document.getElementById('company-name').textContent = data.companyName;
  document.getElementById('doc-type-badge').textContent = data.documentType;

  playTrapSnap(data.riskScore);
}

// Subtle "trap jaws snapping shut" flourish on the header icon when the
// document turns out to be genuinely dangerous. Purely decorative, so it's
// skipped entirely under prefers-reduced-motion.
function playTrapSnap(riskScore) {
  if (riskScore <= 75 || prefersReducedMotion()) return;
  const icon = document.querySelector('#btn-back-logo .logo-icon-sm');
  if (!icon) return;
  icon.classList.remove('trap-snap');
  // Force reflow so re-adding the class restarts the animation on repeat scans.
  void icon.offsetWidth;
  icon.classList.add('trap-snap');
}

function renderRiskHero(data) {
  const ring = document.getElementById('risk-ring-progress');
  const scoreEl = document.getElementById('risk-score-value');
  const levelEl = document.getElementById('risk-level-label');
  const readEl = document.getElementById('reading-time');
  const tldrEl = document.getElementById('tldr-text');

  const finalColor = getScoreColor(data.riskScore);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (data.riskScore / 100) * circumference;

  ring.classList.add('risk-ring-animate');

  if (prefersReducedMotion()) {
    ring.style.stroke = finalColor;
    ring.style.strokeDashoffset = offset;
    scoreEl.textContent = data.riskScore;
    scoreEl.style.color = finalColor;
  } else {
    // Gauge sweep: ring + number count up together, color shifting
    // green -> red in step with the live value (not just the endpoint).
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = offset;
    });
    animateNumber(scoreEl, data.riskScore, 1500, value => {
      const liveColor = interpolateRiskColor(value);
      ring.style.stroke = liveColor;
      scoreEl.style.color = liveColor;
    });
  }

  levelEl.textContent = data.riskLevel;
  levelEl.style.color = finalColor;
  if (data.riskScore > 75) levelEl.classList.add('pulse');

  readEl.textContent = `Est. ${data.readingTime} to read the full document`;
  tldrEl.textContent = data.tldr;
}

function animateNumber(el, target, duration, onTick) {
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * target);
    el.textContent = value;
    if (onTick) onTick(value);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Continuous green -> amber -> red gradient used while the gauge sweeps up,
// so the color reads as a live measurement rather than a snap at the end.
const RISK_COLOR_STOPS = [
  { pct: 0, rgb: [34, 197, 94] },
  { pct: 30, rgb: [34, 197, 94] },
  { pct: 50, rgb: [217, 119, 6] },
  { pct: 75, rgb: [234, 88, 12] },
  { pct: 100, rgb: [220, 38, 38] }
];

function interpolateRiskColor(score) {
  const pct = Math.max(0, Math.min(100, score));
  let lo = RISK_COLOR_STOPS[0];
  let hi = RISK_COLOR_STOPS[RISK_COLOR_STOPS.length - 1];
  for (let i = 0; i < RISK_COLOR_STOPS.length - 1; i++) {
    if (pct >= RISK_COLOR_STOPS[i].pct && pct <= RISK_COLOR_STOPS[i + 1].pct) {
      lo = RISK_COLOR_STOPS[i];
      hi = RISK_COLOR_STOPS[i + 1];
      break;
    }
  }
  const range = hi.pct - lo.pct || 1;
  const t = (pct - lo.pct) / range;
  const rgb = lo.rgb.map((c, i) => Math.round(c + (hi.rgb[i] - c) * t));
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function renderGrades(grades) {
  const row = document.getElementById('grades-row');
  const items = [
    { key: 'dataPrivacy', label: 'Data Privacy' },
    { key: 'userRights', label: 'User Rights' },
    { key: 'transparency', label: 'Transparency' },
    { key: 'fairness', label: 'Fairness' },
    { key: 'accountability', label: 'Accountability' }
  ];

  row.innerHTML = items.map((item, i) => {
    const grade = grades[item.key];
    const pct = gradeToPercent(grade);
    return `
      <div class="grade-card grade-${grade}" style="animation-delay:${i * 100}ms">
        <div class="grade-circle">${grade}</div>
        <div class="grade-label">${item.label}</div>
        <div class="grade-bar-track">
          <div class="grade-bar-fill" data-pct="${pct}" style="transition-delay:${i * 80 + 350}ms"></div>
        </div>
      </div>`;
  }).join('');

  // Fill bars 0 -> value using a transform (not width) so it stays
  // compositor-only. Set on the next frame so the 0-state actually paints
  // first and the transition has something to animate from.
  if (prefersReducedMotion()) {
    row.querySelectorAll('.grade-bar-fill').forEach(bar => {
      bar.style.transform = `scaleX(${bar.dataset.pct / 100})`;
    });
  } else {
    requestAnimationFrame(() => {
      row.querySelectorAll('.grade-bar-fill').forEach(bar => {
        bar.style.transform = `scaleX(${bar.dataset.pct / 100})`;
      });
    });
  }
}

function gradeToPercent(grade) {
  return { A: 95, B: 80, C: 60, D: 40, F: 20 }[grade] ?? 60;
}

function renderTraps(traps, onLearnMore) {
  const list = document.getElementById('traps-list');
  const countEl = document.getElementById('trap-count');
  const catFilters = document.getElementById('category-filters');

  countEl.textContent = `${traps.length} traps found`;

  const categories = [...new Set(traps.map(t => t.category))];
  catFilters.innerHTML = categories.map(cat => `
    <button class="filter-pill cat-pill" data-category="${cat}">
      ${getCategoryIcon(cat)} ${formatCategoryName(cat)}
    </button>
  `).join('');

  renderTrapCards(traps, onLearnMore);
  setupFilters(traps, onLearnMore);
}

function renderTrapCards(traps, onLearnMore) {
  const list = document.getElementById('traps-list');
  // Group visually by severity (critical first) so the stagger-in reads as
  // clusters of risk rather than the model's original clause order.
  const sorted = [...traps].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity) || a.id - b.id);
  list.innerHTML = sorted.map((trap, i) => `
    <div class="trap-card severity-${trap.severity}" data-severity="${trap.severity}" data-category="${trap.category}" style="animation-delay:${i * 50}ms">
      <div class="trap-strip ${trap.severity}"></div>
      <div class="trap-body">
        <div class="trap-top-row">
          <span class="category-badge ${getCategoryClass(trap.category)}">
            ${getCategoryIcon(trap.category)} ${formatCategoryName(trap.category)}
          </span>
          <span class="severity-dot ${trap.severity}"></span>
        </div>
        <div class="trap-title">${escapeHtml(trap.title)}</div>
        <div class="trap-quote">"${escapeHtml(truncateQuote(trap.quote))}"</div>
        <div class="trap-translation">${escapeHtml(trap.translation)}</div>
        ${trap.impact ? `<div class="trap-impact">${escapeHtml(trap.impact)}</div>` : ''}
        ${trap.commonality ? `<div class="trap-commonality">How common? ${escapeHtml(trap.commonality)}</div>` : ''}
        <button class="trap-learn-more" data-trap-id="${trap.id}">Learn More &rarr;</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.trap-learn-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.trapId);
      const trap = traps.find(t => t.id === id);
      if (trap) onLearnMore(trap);
    });
  });
}

function setupFilters(traps, onLearnMore) {
  let activeSeverity = 'all';
  let activeCategory = null;

  const sevFilters = document.getElementById('severity-filters');
  const catFilters = document.getElementById('category-filters');

  sevFilters.addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    sevFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeSeverity = pill.dataset.severity;
    applyFilters();
  });

  catFilters.addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    if (pill.classList.contains('active')) {
      pill.classList.remove('active');
      activeCategory = null;
    } else {
      catFilters.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.category;
    }
    applyFilters();
  });

  function applyFilters() {
    const filtered = traps.filter(t => {
      if (activeSeverity !== 'all' && t.severity !== activeSeverity) return false;
      if (activeCategory && t.category !== activeCategory) return false;
      return true;
    });
    renderTrapCards(filtered, onLearnMore);
  }
}

function renderGoodClauses(clauses) {
  const list = document.getElementById('good-list');
  const countEl = document.getElementById('good-count');
  const toggle = document.getElementById('good-toggle');

  if (!clauses.length) {
    toggle.parentElement.classList.add('hidden');
    return;
  }

  countEl.textContent = clauses.length;

  list.innerHTML = `<div class="good-list-inner">
    ${clauses.map(c => `
      <div class="good-card">
        <div class="good-strip"></div>
        <div class="good-body">
          <div class="good-card-title">${escapeHtml(c.title)}</div>
          <div class="good-card-desc">${escapeHtml(c.description)}</div>
          ${c.quote ? `<div class="good-card-quote">"${escapeHtml(truncateQuote(c.quote))}"</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;

  toggle.addEventListener('click', () => {
    const expanded = list.classList.contains('expanded');
    list.classList.toggle('collapsed', expanded);
    list.classList.toggle('expanded', !expanded);
    toggle.classList.toggle('expanded', !expanded);
  });
}

function renderComparisons(comp) {
  const section = document.getElementById('comparisons-section');
  const worseList = document.getElementById('worse-companies');
  const betterList = document.getElementById('better-companies');

  if (!comp.betterThan.length && !comp.worseThan.length) {
    section.classList.add('hidden');
    return;
  }

  worseList.innerHTML = comp.betterThan.map(c => `<li>${escapeHtml(c)}</li>`).join('');
  betterList.innerHTML = comp.worseThan.map(c => `<li>${escapeHtml(c)}</li>`).join('');
}

export function renderShareCard(data) {
  const ring = document.getElementById('share-ring-progress');
  const scoreEl = document.getElementById('share-score');
  const labelEl = document.getElementById('share-risk-label');
  const companyEl = document.getElementById('share-company');
  const tldrEl = document.getElementById('share-tldr');
  const gradesEl = document.getElementById('share-grades');
  const trapsEl = document.getElementById('share-top-traps');

  const color = getScoreColor(data.riskScore);
  const circ = 2 * Math.PI * 52;
  const offset = circ - (data.riskScore / 100) * circ;

  ring.style.stroke = color;
  ring.style.strokeDashoffset = offset;
  scoreEl.textContent = data.riskScore;
  scoreEl.style.color = color;
  labelEl.textContent = data.riskLevel;
  labelEl.style.color = color;
  companyEl.textContent = data.companyName;
  tldrEl.textContent = data.tldr;

  const gradeItems = [
    { key: 'dataPrivacy', label: 'Privacy' },
    { key: 'userRights', label: 'Rights' },
    { key: 'transparency', label: 'Transparency' },
    { key: 'fairness', label: 'Fairness' },
    { key: 'accountability', label: 'Accountability' }
  ];

  gradesEl.innerHTML = gradeItems.map(g => {
    const grade = data.grades[g.key];
    return `<div class="share-grade-item">
      <span class="share-grade-letter" style="background:${getGradeColor(grade)}">${grade}</span>
      <span>${g.label}</span>
    </div>`;
  }).join('');

  const topTraps = [...data.traps]
    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
    .slice(0, 3);

  trapsEl.innerHTML = topTraps.map(t => `
    <div class="share-trap-item">
      <div>
        <div class="share-trap-title">${escapeHtml(t.title)}</div>
        <div class="share-trap-desc">${escapeHtml(t.translation)}</div>
      </div>
    </div>
  `).join('');
}

export function generateTextSummary(data) {
  let text = `TERMSTRAP REPORT: ${data.companyName}\n`;
  text += `${'='.repeat(40)}\n\n`;
  text += `Risk Score: ${data.riskScore}/100 — ${data.riskLevel}\n`;
  text += `Document: ${data.documentType}\n\n`;
  text += `TL;DR: ${data.tldr}\n\n`;
  text += `GRADES:\n`;
  text += `  Data Privacy: ${data.grades.dataPrivacy}\n`;
  text += `  User Rights: ${data.grades.userRights}\n`;
  text += `  Transparency: ${data.grades.transparency}\n`;
  text += `  Fairness: ${data.grades.fairness}\n`;
  text += `  Accountability: ${data.grades.accountability}\n\n`;
  text += `TRAPS FOUND (${data.traps.length}):\n`;
  data.traps.forEach((t, i) => {
    text += `\n${i + 1}. [${t.severity.toUpperCase()}] ${t.title}\n`;
    text += `   ${t.translation}\n`;
  });
  text += `\n\nScanned with TermsTrap`;
  return text;
}

function severityOrder(s) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s] ?? 2;
}

function formatCategoryName(cat) {
  return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function truncateQuote(q) {
  if (!q) return '';
  return q.length > 200 ? q.slice(0, 200) + '...' : q;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
