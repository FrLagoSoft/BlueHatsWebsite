// Thin wrappers around the /api/*.bxs endpoints (see backend's API contract
// in the root README). Centralizes the fetch/JSON boilerplate that used to be
// duplicated across Hero.jsx and BuildResult.jsx.

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

/** Full build pipeline. Throws on failure - the caller drives status/error UI from that. */
export async function buildAgent({ prompt, apiKey, buildId }) {
  const { ok, status, data } = await postJSON('/api/build.bxs', { prompt, apiKey, buildId })
  if (!ok || data.error) throw new Error(data.error || `Request failed (${status})`)
  return data
}

/** Polled while a build is running. Never throws - a missed poll just waits for the next tick. */
export async function getBuildProgress(buildId) {
  const res = await fetch(`/api/progress.bxs?id=${buildId}`)
  return res.json()
}

/** Free re-check (`bxAgents build`, no API key). Returns the raw report either way. */
export async function checkBuild(slug) {
  const { data } = await postJSON('/api/run.bxs', { slug })
  return data
}

/** Real LLM turn against a generated agent. Returns the raw report; check `data.error`. */
export async function runLiveAgent({ slug, apiKey }) {
  const { data } = await postJSON('/api/runLive.bxs', { slug, apiKey })
  return data
}
