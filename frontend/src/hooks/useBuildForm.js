// This page is calling for buildAgent() and the getBuildProcess from the backend. 
// What kenny made, basically. Just the progress bar. 
import { useRef, useState } from 'react'
import { buildAgent, getBuildProgress } from '../api'

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

  function startPolling(buildId) {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const data = await getBuildProgress(buildId)
        if (buildIdRef.current !== buildId) return
        setProgressPercent(data.percent ?? 0)
        setProgressLabel(data.label ?? '')
      } catch {
        // progress is decoration - a missed poll just waits for the next tick
      }
    }, 1000)
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
    startPolling(buildId)

    try {
      const data = await buildAgent({ prompt, apiKey, buildId })
      setReport(data)
      setStatus('done')
      setProgressPercent(100)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    } finally {
      stopPolling()
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
