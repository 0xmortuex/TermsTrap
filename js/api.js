const PROXY_URL = 'https://termstrap-proxy.mortuexhavoc.workers.dev';

export async function analyzeTerms(text) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'analyze', text })
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, 'Analysis failed'));
  const data = await res.json();
  return data.result;
}

export async function fetchTrapDetail(trapData) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'detail',
      trapData: {
        category: trapData.category,
        title: trapData.title,
        quote: trapData.quote,
        translation: trapData.translation
      }
    })
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, 'Detail fetch failed'));
  const data = await res.json();
  return data.result;
}

// Surface the worker's own error message (e.g. rate-limit text) instead of
// just a bare status code, so the user sees something actionable.
async function extractErrorMessage(res, fallbackLabel) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // response body wasn't JSON — fall through to a status-based message
  }

  const friendly = body && (body.error || body.message || body.detail);
  if (friendly) return friendly;

  if (res.status === 429) return 'Rate limit reached. Please wait a moment and try again.';
  if (res.status >= 500) return 'The analysis service is temporarily unavailable. Please try again shortly.';

  return `${fallbackLabel} (${res.status})`;
}
