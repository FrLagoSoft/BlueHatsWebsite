// Thin wrappers around the /api/*.bxs endpoints (see backend's API contract
// in the root README). Centralizes the fetch/JSON boilerplate that used to be
// duplicated across Hero.jsx and BuildResult.jsx.

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // Not every response is JSON. nginx's own 502/503/504 pages are HTML, and a
  // gateway that gives up mid-request can send nothing at all. Calling
  // res.json() blindly turned all of those into "Unexpected end of JSON input",
  // which hides the status code that actually explains what went wrong.
  const text = await res.text()

  if (!text.trim()) {
    return {
      ok: false,
      status: res.status,
      data: { error: `Empty response (HTTP ${res.status}) — the request likely timed out upstream` },
    }
  }

  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) }
  } catch {
    return {
      ok: false,
      status: res.status,
      data: { error: `Non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}` },
    }
  }
}

/**
 * Kicks off a build and returns as soon as the server has accepted it (202).
 * The pipeline runs on the server's own thread - the report is collected from
 * getBuildProgress(), not from this call, because a multi-minute request dies
 * at Amplify's CloudFront edge with a 504. Throws if the build couldn't start.
 */
export async function startBuild({ prompt, apiKey, buildId }) {
  const { ok, status, data } = await postJSON('/api/build.bxs', { prompt, apiKey, buildId })
  if (!ok || data.error) throw new Error(data.error || `Request failed (${status})`)
  return data
}

/**
 * Polled while a build is running. Drives the progress bar, and carries the
 * finished report once `state` is 'done' (or the failure once it is 'error').
 * Never throws - a missed poll just waits for the next tick.
 */
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
