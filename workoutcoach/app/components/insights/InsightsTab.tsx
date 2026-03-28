'use client'

import { motion } from 'framer-motion'
import { useInsightsData } from './useInsightsData'
import ExerciseFilter from './ExerciseFilter'
import ProgressionChart from './ProgressionChart'
import VolumeHeatmap from './VolumeHeatmap'
import ExerciseDistribution from './ExerciseDistribution'
import RpeTrends from './RpeTrends'
import PersonalRecords from './PersonalRecords'
import WeeklyVolume from './WeeklyVolume'
import InsightsSkeleton from './InsightsSkeleton'
import EmptyInsights from './EmptyInsights'

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: SPRING },
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5 flex flex-col ${className ?? ''}`}
    >
      <span className="text-xs text-zinc-500 tracking-wide uppercase font-medium mb-3">
        {title}
      </span>
      <div className="flex-1 min-h-0">{children}</div>
    </motion.div>
  )
}

export default function InsightsTab({
  onNavigate,
}: {
  onNavigate: (tab: string) => void
}) {
  const {
    workouts,
    loading,
    error,
    days,
    setDays,
    selectedExercise,
    setSelectedExercise,
    exerciseList,
    progressionData,
    volumeByDay,
    exerciseDistribution,
    rpeByDate,
    personalRecords,
    weeklyVolume,
    retry,
  } = useInsightsData()

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <InsightsSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="rounded-xl px-4 py-3 text-sm bg-red-950/60 border border-red-800/50 text-red-300 flex items-center justify-between">
          <span>Failed to load insights: {error}</span>
          <button
            onClick={retry}
            className="text-red-200 hover:text-red-100 font-medium text-xs px-3 py-1 rounded-lg bg-red-900/40 hover:bg-red-900/60 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!workouts.length) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyInsights onNavigate={() => onNavigate('upload')} />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
      {/* Header + filter */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Training Insights</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {workouts.length} entries across {exerciseList.length} exercises
          </p>
        </div>
        <ExerciseFilter
          exerciseList={exerciseList}
          selectedExercise={selectedExercise}
          onSelect={setSelectedExercise}
          days={days}
          onDaysChange={setDays}
        />
      </div>

      {/* Bento grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 bento-grid"
      >
        <style>{`
          @media (min-width: 1024px) {
            .bento-grid {
              grid-template-columns: 1.4fr 1fr 0.8fr !important;
            }
          }
        `}</style>

        {/* Row 1: Progression (span 2) + PRs (span 1) */}
        <ChartCard title="Weight Progression" className="lg:col-span-2 h-[280px]">
          <ProgressionChart
            data={progressionData.data}
            exercises={progressionData.exercises}
          />
        </ChartCard>

        <ChartCard title="Personal Records" className="h-[280px] overflow-y-auto">
          <PersonalRecords records={personalRecords} />
        </ChartCard>

        {/* Row 2: Heatmap (span 1) + Distribution (span 2) */}
        <ChartCard title="Volume Heatmap" className="h-[220px]">
          <VolumeHeatmap data={volumeByDay} days={days} />
        </ChartCard>

        <ChartCard title="Exercise Breakdown" className="lg:col-span-2 h-[220px]">
          <ExerciseDistribution data={exerciseDistribution} />
        </ChartCard>

        {/* Row 3: RPE (span 1) + Weekly Volume (span 2) */}
        <ChartCard title="RPE Trends" className="h-[220px]">
          <RpeTrends data={rpeByDate} />
        </ChartCard>

        <ChartCard title="Weekly Volume" className="lg:col-span-2 h-[220px]">
          <WeeklyVolume data={weeklyVolume} />
        </ChartCard>
      </motion.div>
    </div>
  )
}
