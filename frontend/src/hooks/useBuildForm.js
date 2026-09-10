// This page is calling for startBuild() and getBuildProgress() from the backend.
// What kenny made, basically. Just the progress bar - except the poll now also
// carries the finished report, since the build runs on a background thread.
import { useRef, useState } from 'react'
import { startBuild, getBuildProgress } from '../api'

const POLL_MS = 1000
// A build that has said nothing for this long is not coming back - most likely
// the server restarted underneath it, which drops the in-memory progress record.
const POLL_TIMEOUT_MS = 15 * 60 * 1000

function newBuildId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Owns the prompt -> build -> progress -> result workflow. Hero.jsx just renders it. */
export function useBuildForm() {
  const [prompt, setPrompt] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [keyFieldHidden, setKeyFieldHidden] = useState(false)
  const [status, setStatus] = useState('idle') // idle | building | done | error
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const pollRef = useRef(null)
  const buildIdRef = useRef(null)

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  /**
   * Drives the progress bar AND collects the result. Since the build no longer
   * runs inside the POST that started it, this poll is the only channel the
   * finished report comes back through.
   */
  function startPolling(buildId) {
    stopPolling()
    const startedAt = Date.now()

    pollRef.current = setInterval(async () => {
      let data
      try {
        data = await getBuildProgress(buildId)
      } catch {
        // a missed poll just waits for the next tick
        return
      }
      if (buildIdRef.current !== buildId) return

      setProgressPercent(data.percent ?? 0)
      setProgressLabel(data.label ?? '')

      if (data.state === 'done') {
        stopPolling()
        setReport(data.report ?? null)
        setProgressPercent(100)
        setStatus('done')
        return
      }

      if (data.state === 'error') {
        stopPolling()
        setError(data.report?.error || data.label || 'Build failed')
        setStatus('error')
        return
      }

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling()
        setError('Timed out waiting for the build to finish')
        setStatus('error')
      }
    }, POLL_MS)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!prompt.trim() || status === 'building') return

    const buildId = newBuildId()
    buildIdRef.current = buildId

    setStatus('building')
    setError('')
    setReport(null)
    setKeyFieldHidden(true)
    setProgressPercent(0)
    setProgressLabel('')

    try {
      // Returns as soon as the server accepts the job; polling takes it from here
      // and stays running until the build reports done or error.
      await startBuild({ prompt, apiKey, buildId })
      startPolling(buildId)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  return {
    prompt,
    setPrompt,
    apiKey,
    setApiKey,
    keyFieldHidden,
    status,
    error,
    report,
    progressPercent,
    progressLabel,
    handleSubmit,
  }
}
