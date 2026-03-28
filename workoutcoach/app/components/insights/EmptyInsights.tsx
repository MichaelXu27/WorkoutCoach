'use client'

import { motion } from 'framer-motion'
import { ChartLineUp, ArrowRight } from '@phosphor-icons/react'

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

export default function EmptyInsights({ onNavigate }: { onNavigate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="flex flex-col items-center justify-center py-24 px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-zinc-900/80 border border-zinc-800/50 flex items-center justify-center mb-6">
        <ChartLineUp size={32} weight="duotone" className="text-zinc-600" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-zinc-200 mb-2">
        No workout data yet
      </h3>
      <p className="text-sm text-zinc-500 max-w-[40ch] text-center leading-relaxed mb-6">
        Upload a CSV or log your first workout to see training insights and progression charts.
      </p>
      <motion.button
        onClick={onNavigate}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-white transition-colors active:-translate-y-[1px]"
      >
        Go to Upload
        <ArrowRight size={14} weight="bold" />
      </motion.button>
    </motion.div>
  )
}
