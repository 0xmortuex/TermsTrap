import { analyzeTerms } from './api.js';
import { parseAnalysis } from './parser.js';
import { renderReport, renderShareCard, generateTextSummary } from './renderer.js';
import { initModal } from './modal.js';
import { SAMPLES } from './samples.js';

const inputView = document.getElementById('input-view');
const reportView = document.getElementById('report-view');
const textarea = document.getElementById('tos-input');
const scanBtn = document.getElementById('btn-scan');
const sampleBtn = document.getElementById('btn-sample');
const scanLine = document.getElementById('scan-line');
const loadingInfo = document.getElementById('loading-info');
const elapsedTimer = document.getElementById('elapsed-timer');

const btnBackLogo = document.getElementById('btn-back-logo');
const btnScanNew = document.getElementById('btn-scan-new');
const btnShare = document.getElementById('btn-share');
const fabNew = document.getElementById('fab-new');
const fabCopy = document.getElementById('fab-copy');

const shareModal = document.getElementById('share-modal');
const shareClose = document.getElementById('share-close');
const shareCopyText = document.getElementById('share-copy-text');
const shareDownload = document.getElementById('share-download');

let currentData = null;
let timerInterval = null;

// Client-side length guardrails: very large documents risk the model
// truncating its JSON response mid-stream (see parser.js guard).
const MAX_CHARS = 60000;
const WARN_CHARS = 20000;

const { openTrapModal } = initModal();

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Event listeners
scanBtn.addEventListener('click', e => {
  createRipple(e, scanBtn);
  startScan();
});
sampleBtn.addEventListener('click', e => {
  createRipple(e, sampleBtn);
  loadRandomSample();
});

document.querySelectorAll('.chip[data-sample]').forEach(chip => {
  chip.addEventListener('click', () => {
    const key = chip.dataset.sample;
    if (SAMPLES[key]) {
      textarea.value = SAMPLES[key];
      textarea.focus();
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter' && inputView.classList.contains('active')) {
    startScan();
  }
});

btnBackLogo.addEventListener('click', showInput);
btnScanNew.addEventListener('click', showInput);
fabNew.addEventListener('click', showInput);

fabCopy.addEventListener('click', () => {
  if (!currentData) return;
  const text = generateTextSummary(currentData);
  navigator.clipboard.writeText(text).then(() => showToast('Report copied to clipboard', 'success'));
});

btnShare.addEventListener('click', () => {
  if (!currentData) return;
  renderShareCard(currentData);
  shareModal.classList.remove('hidden');
});

shareClose.addEventListener('click', () => closeShareModal());
shareModal.addEventListener('click', e => {
  if (e.target === shareModal) closeShareModal();
});

shareCopyText.addEventListener('click', () => {
  if (!currentData) return;
  const text = generateTextSummary(currentData);
  navigator.clipboard.writeText(text).then(() => showToast('Text summary copied', 'success'));
});

shareDownload.addEventListener('click', async () => {
  if (!currentData) return;
  const card = document.getElementById('share-card');
  try {
    shareDownload.disabled = true;
    shareDownload.textContent = 'Generating...';
    const canvas = await html2canvas(card, {
      backgroundColor: '#0b0b0f',
      scale: 2,
      useCORS: true,
      logging: false,
      width: 600,
      height: card.scrollHeight
    });
    const link = document.createElement('a');
    link.download = `termstrap-${currentData.companyName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('PNG downloaded', 'success');
  } catch (err) {
    showToast('Failed to generate PNG', 'error');
  } finally {
    shareDownload.disabled = false;
    shareDownload.textContent = 'Download as PNG';
  }
});

function closeShareModal() {
  shareModal.classList.add('removing');
  setTimeout(() => {
    shareModal.classList.add('hidden');
    shareModal.classList.remove('removing');
  }, 200);
}

async function startScan() {
  const text = textarea.value.trim();
  if (!text) {
    showToast('Please paste a Terms of Service document first', 'error');
    return;
  }
  if (text.length < 100) {
    showToast('Text seems too short for a ToS. Please paste the full document.', 'error');
    return;
  }
  if (text.length > MAX_CHARS) {
    showToast(`Document is too long (${text.length.toLocaleString()} chars). Please trim it to under ${MAX_CHARS.toLocaleString()} characters and try again.`, 'error');
    return;
  }
  if (text.length > WARN_CHARS) {
    showToast(`Long document (${text.length.toLocaleString()} chars) — the analysis may take longer or get cut short. Trimming to the key sections helps.`, 'info');
  }

  setLoading(true);

  try {
    const raw = await analyzeTerms(text);
    const data = parseAnalysis(raw);
    currentData = data;
    showReport(data);
  } catch (err) {
    showToast(`Analysis failed: ${err.message}`, 'error');
    setLoading(false);
  }
}

function setLoading(on) {
  scanBtn.disabled = on;
  textarea.readOnly = on;

  if (on) {
    textarea.classList.add('scanning');
    scanLine.classList.remove('hidden');
    loadingInfo.classList.remove('hidden');
    startTimer();
  } else {
    textarea.classList.remove('scanning');
    scanLine.classList.add('hidden');
    loadingInfo.classList.add('hidden');
    stopTimer();
  }
}

function startTimer() {
  let seconds = 0;
  elapsedTimer.textContent = '0s';
  timerInterval = setInterval(() => {
    seconds++;
    elapsedTimer.textContent = `${seconds}s`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function showReport(data) {
  setLoading(false);
  transitionViews(inputView, reportView, () => {
    renderReport(data, openTrapModal);
    window.scrollTo(0, 0);
  });
}

function showInput() {
  transitionViews(reportView, inputView, () => {
    window.scrollTo(0, 0);
  });
}

// Crossfades the outgoing view out before swapping in the incoming one,
// instead of an abrupt display:none/flex cut.
function transitionViews(fromView, toView, onSwap) {
  if (prefersReducedMotion()) {
    fromView.classList.remove('active');
    toView.classList.add('active');
    if (onSwap) onSwap();
    return;
  }

  fromView.classList.add('view-leaving');
  window.setTimeout(() => {
    fromView.classList.remove('active', 'view-leaving');
    toView.classList.add('active');
    if (onSwap) onSwap();
  }, 220);
}

// Tactile ripple feedback on primary actions, from the click point outward.
function createRipple(e, btn) {
  if (prefersReducedMotion()) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = (e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
  const y = (e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.addEventListener('animationend', () => ripple.remove());
  btn.appendChild(ripple);
}

function loadRandomSample() {
  const keys = Object.keys(SAMPLES);
  const key = keys[Math.floor(Math.random() * keys.length)];
  textarea.value = SAMPLES[key];
  textarea.focus();
  showToast('Sample ToS loaded', 'info');
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
