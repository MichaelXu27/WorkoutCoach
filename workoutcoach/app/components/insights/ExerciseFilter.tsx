'use client'

import { motion } from 'framer-motion'
import { formatExerciseName } from './useInsightsData'

const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 200, damping: 25 }

interface ExerciseFilterProps {
  exerciseList: string[]
  selectedExercise: string | null
  onSelect: (exercise: string | null) => void
  days: number
  onDaysChange: (days: number) => void
}

const DAY_OPTIONS = [30, 60, 90] as const

export default function ExerciseFilter({
  exerciseList,
  selectedExercise,
  onSelect,
  days,
  onDaysChange,
}: ExerciseFilterProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1 flex-1 scrollbar-hide">
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={SPRING_SNAPPY}
          onClick={() => onSelect(null)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selectedExercise === null
              ? 'bg-zinc-100 text-zinc-950'
              : 'bg-zinc-900/80 border border-zinc-800/50 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All
        </motion.button>
        {exerciseList.map((ex) => (
          <motion.button
            key={ex}
            whileTap={{ scale: 0.96 }}
            transition={SPRING_SNAPPY}
            onClick={() => onSelect(ex)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedExercise === ex
                ? 'bg-zinc-100 text-zinc-950'
                : 'bg-zinc-900/80 border border-zinc-800/50 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {formatExerciseName(ex)}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-1 bg-zinc-900/80 border border-zinc-800/40 rounded-lg p-0.5 shrink-0">
        {DAY_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => onDaysChange(d)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              days === d
                ? 'bg-zinc-800 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>
    </div>
  )
}
