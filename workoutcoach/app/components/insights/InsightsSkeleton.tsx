'use client'

import { motion } from 'framer-motion'

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

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <motion.div
      variants={itemVariants}
      className={`bg-zinc-900/60 border border-zinc-800/50 rounded-2xl animate-pulse ${className ?? ''}`}
    />
  )
}

export default function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-zinc-900/60 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Bento grid skeleton */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        style={{ gridTemplateColumns: undefined }}
      >
        <style>{`@media (min-width: 1024px) { .insights-skeleton-grid { grid-template-columns: 1.4fr 1fr 0.8fr !important; } }`}</style>
        <SkeletonBlock className="lg:col-span-2 h-[280px] insights-skeleton-grid" />
        <SkeletonBlock className="h-[280px]" />
        <SkeletonBlock className="h-[220px]" />
        <SkeletonBlock className="lg:col-span-2 h-[220px]" />
        <SkeletonBlock className="h-[220px]" />
        <SkeletonBlock className="lg:col-span-2 h-[220px]" />
      </motion.div>
    </div>
  )
}
