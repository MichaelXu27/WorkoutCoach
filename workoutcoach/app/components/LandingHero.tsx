'use client'

import { useState, useEffect, memo } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import {
  Barbell,
  Lightning,
  VideoCamera,
  ChartLineUp,
  ArrowRight,
  Brain,
  Timer,
  TrendUp,
} from '@phosphor-icons/react'

// ─── Spring config for premium feel ───
const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 200, damping: 25 }

// ─── Stagger orchestration ───
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING,
  },
}

// ─── Perpetual typewriter for the command input ───
const TYPEWRITER_PROMPTS = [
  'Generate a 5-day push/pull/legs split...',
  'Analyze my squat form from video...',
  'Show me my bench press progression...',
  'Plan a deload week based on RPE trends...',
  'Compare my deadlift volume this month...',
]

const TypewriterLoop = memo(function TypewriterLoop() {
  const [promptIndex, setPromptIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentPrompt = TYPEWRITER_PROMPTS[promptIndex]

  useEffect(() => {
    if (!isDeleting && charIndex < currentPrompt.length) {
      const timeout = setTimeout(() => setCharIndex((c) => c + 1), 38)
      return () => clearTimeout(timeout)
    }
    if (!isDeleting && charIndex === currentPrompt.length) {
      const timeout = setTimeout(() => setIsDeleting(true), 2200)
      return () => clearTimeout(timeout)
    }
    if (isDeleting && charIndex > 0) {
      const timeout = setTimeout(() => setCharIndex((c) => c - 1), 18)
      return () => clearTimeout(timeout)
    }
    if (isDeleting && charIndex === 0) {
      setIsDeleting(false)
      setPromptIndex((i) => (i + 1) % TYPEWRITER_PROMPTS.length)
    }
  }, [charIndex, isDeleting, currentPrompt.length, promptIndex])

  return (
    <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl px-5 py-4 font-mono text-sm">
      <Lightning weight="bold" className="text-emerald-500 shrink-0" size={18} />
      <span className="text-zinc-400">
        {currentPrompt.slice(0, charIndex)}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
          className="inline-block w-[2px] h-4 bg-emerald-500 ml-[1px] align-middle"
        />
      </span>
    </div>
  )
})

// ─── Live metric pulse ───
const METRICS = [
  { label: 'Total Volume', value: '127,450', unit: 'lbs', trend: '+12.3%' },
  { label: 'Sessions', value: '48', unit: 'this month', trend: '+3' },
  { label: 'Top Squat', value: '315', unit: 'lbs', trend: 'PR' },
]

const PulsingMetric = memo(function PulsingMetric({
  label,
  value,
  unit,
  trend,
  index,
}: {
  label: string
  value: string
  unit: string
  trend: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.6 + index * 0.15 }}
      className="flex flex-col gap-1"
    >
      <span className="text-xs text-zinc-500 tracking-wide uppercase">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-zinc-100 font-mono">
          {value}
        </span>
        <span className="text-xs text-zinc-500">{unit}</span>
      </div>
      <div className="flex items-center gap-1">
        <TrendUp size={12} weight="bold" className="text-emerald-500" />
        <span className="text-xs text-emerald-500 font-medium">{trend}</span>
      </div>
    </motion.div>
  )
})

// ─── Feature cards with spotlight border effect ───
const FEATURES = [
  {
    icon: Barbell,
    title: 'Track Everything',
    description:
      'Import from Strong, CSV, or log manually. Every set, rep, and RPE captured with zero friction.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Coaching',
    description:
      'Five specialized coaching personas analyze your data and give targeted, actionable programming advice.',
  },
  {
    icon: VideoCamera,
    title: 'Real-Time Form Check',
    description:
      'Computer vision tracks your movement patterns live through your webcam. Instant rep counting and feedback.',
  },
  {
    icon: ChartLineUp,
    title: 'Smart Generation',
    description:
      'Describe your goals in plain language. Get a complete, periodized workout program built from your history.',
  },
]

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: typeof Barbell
  title: string
  description: string
  index: number
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const spotlightX = useTransform(mouseX, (v) => `${v}px`)
  const spotlightY = useTransform(mouseY, (v) => `${v}px`)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  return (
    <motion.div
      variants={itemVariants}
      onMouseMove={handleMouseMove}
      className="group relative rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 overflow-hidden"
      whileHover={{ y: -2, transition: SPRING_SNAPPY }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Spotlight gradient that follows cursor */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: useTransform(
            [spotlightX, spotlightY],
            ([x, y]) =>
              `radial-gradient(400px circle at ${x} ${y}, rgba(16, 185, 129, 0.06), transparent 60%)`
          ),
        }}
      />
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center mb-4">
          <Icon size={20} weight="duotone" className="text-emerald-500" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100 mb-2 tracking-tight">{title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

// ─── Floating stats cards (perpetual float animation) ───
const FloatingBadge = memo(function FloatingBadge({
  children,
  delay,
  className,
}: {
  children: React.ReactNode
  delay: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -6, 0],
      }}
      transition={{
        opacity: { duration: 0.4, delay },
        scale: { ...SPRING, delay },
        y: {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: delay + 0.5,
        },
      }}
      className={`absolute hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)] ${className}`}
    >
      {children}
    </motion.div>
  )
})

// ─── Main Landing Hero ───
export default function LandingHero({
  onGetStarted,
}: {
  onGetStarted: () => void
}) {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Subtle mesh gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-emerald-900/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[50%] rounded-full bg-zinc-800/30 blur-[100px]" />
      </div>

      {/* ─── Hero Section ─── */}
      <section className="relative max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 md:gap-16 items-center min-h-[85dvh] py-16 md:py-0">
          {/* Left: Copy */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-[1]"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-emerald-500 bg-emerald-500/8 border border-emerald-500/15 rounded-full px-3 py-1.5">
                <Timer size={14} weight="bold" />
                AI-Powered Training
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl font-semibold tracking-tighter leading-[0.95] text-zinc-100 mb-5"
            >
              Your lifting data,
              <br />
              <span className="text-zinc-500">decoded.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-[50ch] mb-8"
            >
              Track workouts, get real-time form feedback from your camera, and let
              specialized AI coaches turn your training log into smarter programming.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 mb-10">
              <motion.button
                onClick={onGetStarted}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING_SNAPPY}
                className="inline-flex items-center justify-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-6 py-3 rounded-xl hover:bg-white transition-colors active:-translate-y-[1px]"
              >
                Start Training
                <ArrowRight size={16} weight="bold" />
              </motion.button>
              <motion.button
                onClick={onGetStarted}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING_SNAPPY}
                className="inline-flex items-center justify-center gap-2 bg-zinc-900 text-zinc-300 border border-zinc-800 font-medium text-sm px-6 py-3 rounded-xl hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >
                Upload CSV
              </motion.button>
            </motion.div>

            {/* Live typewriter command */}
            <motion.div variants={itemVariants}>
              <TypewriterLoop />
            </motion.div>
          </motion.div>

          {/* Right: Metrics dashboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.3 }}
            className="relative"
          >
            {/* Main dashboard card */}
            <div className="relative bg-zinc-900/70 border border-zinc-800 rounded-[1.5rem] p-6 md:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]">
              {/* Inner refraction border for liquid glass effect */}
              <div className="absolute inset-0 rounded-[1.5rem] border border-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] pointer-events-none" />

              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs text-zinc-500 tracking-wide uppercase font-medium">
                    Training Overview
                  </span>
                  <span className="text-xs text-zinc-600 font-mono">March 2026</span>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                  {METRICS.map((m, i) => (
                    <PulsingMetric key={m.label} {...m} index={i} />
                  ))}
                </div>

                {/* Mini chart visualization */}
                <div className="space-y-3">
                  <span className="text-xs text-zinc-500 tracking-wide uppercase">
                    Weekly Volume
                  </span>
                  <div className="flex items-end gap-[6px] h-20">
                    {[42, 68, 55, 78, 62, 85, 71, 92, 80, 65, 88, 74].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ ...SPRING, delay: 0.8 + i * 0.05 }}
                        className="flex-1 rounded-sm bg-emerald-500/20 relative overflow-hidden"
                      >
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: '100%' }}
                          transition={{ ...SPRING, delay: 1.0 + i * 0.05 }}
                          className="absolute bottom-0 inset-x-0 bg-emerald-500/40 rounded-sm"
                          style={{ height: `${Math.min(h + 15, 100)}%` }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <FloatingBadge delay={1.2} className="top-[-16px] right-8">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-zinc-300 font-medium">Form: 94.7%</span>
            </FloatingBadge>

            <FloatingBadge delay={1.5} className="bottom-4 left-[-24px]">
              <Barbell size={14} weight="duotone" className="text-emerald-500" />
              <span className="text-xs text-zinc-300 font-medium">3 PRs this week</span>
            </FloatingBadge>
          </motion.div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="relative max-w-[1400px] mx-auto px-6 md:px-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={SPRING}
          className="mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tighter text-zinc-100 mb-3">
            Built for serious lifters
          </h2>
          <p className="text-sm md:text-base text-zinc-500 max-w-[55ch] leading-relaxed">
            Not another generic fitness tracker. WorkoutCoach combines real training
            data with computer vision and specialized AI to give you coaching that
            actually understands progressive overload.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} index={i} />
          ))}
        </motion.div>
      </section>
    </div>
  )
}
