'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Trophy } from '@phosphor-icons/react'
import { formatExerciseName, type PersonalRecord } from './useInsightsData'

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const prVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 18 },
  },
}

export default memo(function PersonalRecords({ records }: { records: PersonalRecord[] }) {
  if (!records.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
        <Trophy size={24} weight="duotone" className="text-zinc-700 mb-2" />
        <p className="text-xs text-zinc-600">No PRs recorded yet</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-2 h-full"
    >
      {records.map((pr, i) => (
        <motion.div
          key={`${pr.exercise}-${pr.date}-${i}`}
          variants={prVariants}
          className="flex items-center gap-3 py-2 px-3 rounded-xl bg-zinc-800/30 border border-zinc-800/30"
          whileHover={{
            borderColor: 'rgba(16, 185, 129, 0.2)',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.08)',
          }}
          transition={SPRING}
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Trophy size={14} weight="fill" className="text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">
              {formatExerciseName(pr.exercise)}
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">{pr.date}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-zinc-100 font-mono">{pr.weight}</p>
            <p className="text-[10px] text-zinc-500">
              lbs x {pr.reps}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
})
