import { fetchTrapDetail } from './api.js';
import { parseDetail } from './parser.js';

const detailCache = new Map();

export function initModal() {
  const backdrop = document.getElementById('trap-modal');
  const closeBtn = document.getElementById('modal-close');
  const closeBtnFooter = document.getElementById('modal-close-btn');
  const copyBtn = document.getElementById('modal-copy');

  let currentDetail = null;
  let currentTrap = null;

  closeBtn.addEventListener('click', closeModal);
  closeBtnFooter.addEventListener('click', closeModal);
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeModal();
  });

  copyBtn.addEventListener('click', () => {
    if (!currentDetail || !currentTrap) return;
    const text = formatDetailText(currentTrap, currentDetail);
    navigator.clipboard.writeText(text).then(() => {
      showToast('Analysis copied to clipboard', 'success');
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !backdrop.classList.contains('hidden')) {
      closeModal();
    }
  });

  function closeModal() {
    backdrop.classList.add('removing');
    setTimeout(() => {
      backdrop.classList.add('hidden');
      backdrop.classList.remove('removing');
    }, 200);
  }

  return { openTrapModal };

  async function openTrapModal(trap) {
    currentTrap = trap;
    currentDetail = null;
    const backdrop = document.getElementById('trap-modal');
    const titleEl = document.getElementById('modal-title');
    const quoteEl = document.getElementById('modal-quote');
    const catBadge = document.getElementById('modal-category-badge');
    const sevBadge = document.getElementById('modal-severity-badge');
    const body = document.getElementById('modal-body');

    titleEl.textContent = trap.title;
    quoteEl.textContent = `"${trap.quote}"`;

    const catName = trap.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    catBadge.textContent = catName;
    catBadge.className = `category-badge cat-${getCatClass(trap.category)}`;
    sevBadge.textContent = trap.severity;
    sevBadge.className = `severity-badge ${trap.severity}`;

    body.innerHTML = `<div class="modal-loading"><div class="spinner"></div><span>Loading deep analysis...</span></div>`;
    backdrop.classList.remove('hidden');

    try {
      let detail;
      if (detailCache.has(trap.id)) {
        detail = detailCache.get(trap.id);
      } else {
        const raw = await fetchTrapDetail(trap);
        detail = parseDetail(raw);
        detailCache.set(trap.id, detail);
      }
      currentDetail = detail;
      renderDetail(body, detail);
    } catch (err) {
      body.innerHTML = `<div style="color:var(--danger);text-align:center;padding:2rem;">Failed to load details. ${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderDetail(container, detail) {
  let html = '';

  if (detail.deepAnalysis) {
    html += `<div class="detail-section section-why">
      <h3>Why This Matters</h3>
      <p>${escapeHtml(detail.deepAnalysis)}</p>
    </div>`;
  }

  if (detail.legalContext) {
    html += `<div class="detail-section section-legal">
      <h3>Legal Context</h3>
      <p>${escapeHtml(detail.legalContext)}</p>
    </div>`;
  }

  if (detail.realWorldCases) {
    html += `<div class="detail-section section-cases">
      <h3>Real-World Cases</h3>
      <p>${escapeHtml(detail.realWorldCases)}</p>
    </div>`;
  }

  if (detail.whatYouCanDo && detail.whatYouCanDo.length) {
    html += `<div class="detail-section section-actions">
      <h3>What You Can Do</h3>
      <ul>${detail.whatYouCanDo.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
    </div>`;
  }

  if (detail.optOut) {
    if (detail.optOut.available) {
      html += `<div class="optout-box available">
        <h3>Opt-Out Available</h3>
        <p>${escapeHtml(detail.optOut.instructions)}</p>
      </div>`;
    } else {
      html += `<div class="optout-box unavailable">
        <h3>Opt-Out <span class="optout-badge no">Not Available</span></h3>
        <p>${escapeHtml(detail.optOut.instructions || 'No opt-out mechanism is provided for this clause.')}</p>
      </div>`;
    }
  }

  if (detail.industryComparison) {
    html += `<div class="detail-section section-comparison">
      <h3>Industry Comparison</h3>
      <p>${escapeHtml(detail.industryComparison)}</p>
    </div>`;
  }

  container.innerHTML = html;
}

function formatDetailText(trap, detail) {
  let text = `TRAP: ${trap.title}\n`;
  text += `Category: ${trap.category} | Severity: ${trap.severity}\n`;
  text += `Quote: "${trap.quote}"\n\n`;
  if (detail.deepAnalysis) text += `WHY THIS MATTERS:\n${detail.deepAnalysis}\n\n`;
  if (detail.legalContext) text += `LEGAL CONTEXT:\n${detail.legalContext}\n\n`;
  if (detail.realWorldCases) text += `REAL-WORLD CASES:\n${detail.realWorldCases}\n\n`;
  if (detail.whatYouCanDo?.length) text += `WHAT YOU CAN DO:\n${detail.whatYouCanDo.map(a => `- ${a}`).join('\n')}\n\n`;
  if (detail.optOut) text += `OPT-OUT: ${detail.optOut.available ? detail.optOut.instructions : 'Not available'}\n\n`;
  if (detail.industryComparison) text += `INDUSTRY COMPARISON:\n${detail.industryComparison}\n`;
  return text;
}

function getCatClass(cat) {
  const map = ['data-selling', 'data-sharing', 'tracking', 'arbitration', 'auto-renewal', 'content-rights', 'liability-waiver', 'termination', 'data-retention', 'jurisdiction', 'financial'];
  for (const key of map) {
    if (cat.includes(key)) return key;
  }
  return 'default';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
