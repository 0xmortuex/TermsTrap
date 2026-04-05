const PROXY_URL = 'https://termstrap-proxy.mortuexhavoc.workers.dev';

export async function analyzeTerms(text) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'analyze', text })
  });
  if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
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
  if (!res.ok) throw new Error(`Detail fetch failed (${res.status})`);
  const data = await res.json();
  return data.result;
}
