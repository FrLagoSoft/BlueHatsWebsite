import { AnimatePresence, motion } from 'framer-motion'
import BuildResult from './BuildResult'
import { useBuildForm } from '../hooks/useBuildForm'

function Hero() {
  const {
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
  } = useBuildForm()

  return (
    <section className="relative flex min-h-screen flex-col items-center overflow-hidden bg-brand px-6 pb-16 pt-10 sm:px-12 md:px-20">
      <div className="flex w-full flex-1 flex-col items-center justify-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="whitespace-nowrap font-serif text-[64px] font-semibold leading-tight text-brand-ink"
        >
          What can we help with today?
        </motion.h1>
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
          className="mt-3 h-1.5 w-128 rounded-full bg-accent"
        />

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="mt-10 w-full max-w-3xl"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Build me an agent..."
            disabled={status === 'building'}
            className="w-full rounded-full bg-muted/70 px-8 py-6 text-xl text-brand-ink placeholder-brand-ink/60 shadow-lg outline-none transition focus:ring-2 focus:ring-accent disabled:opacity-70"
          />

          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AI api key..."
            hidden={keyFieldHidden}
            className={`mx-auto mt-3 w-full max-w-xs rounded-full bg-muted/50 px-4 py-2 text-center text-sm text-brand-ink placeholder-brand-ink/60 outline-none transition focus:ring-2 focus:ring-accent ${keyFieldHidden ? '' : 'block'}`}
          />

          {/* invisible: with two text inputs above, the browser needs an explicit
              submit button or Enter stops auto-submitting in either field */}
          <button type="submit" className="hidden">
            Submit
          </button>

          <AnimatePresence>
            {status === 'building' && (
              <motion.div
                key="loading-track"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 h-1 w-full overflow-hidden rounded-full bg-brand-ink/10"
              >
                {/* width is driven by real backend progress (see /api/progress.bxs),
                    not a fake indeterminate loop */}
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {status === 'building' && (
              <motion.p
                key="building"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-sm text-brand-ink/70"
              >
                {progressLabel || 'Building your agent…'} · {progressPercent}%
              </motion.p>
            )}
            {status === 'error' && (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 text-sm text-red-100"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.form>
      </div>

      <AnimatePresence>
        {status === 'done' && report && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mt-4 w-full max-w-5xl"
          >
            {/* blueprint + generated-files card — see BuildResult.jsx */}
            <BuildResult report={report} apiKey={apiKey} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default Hero
