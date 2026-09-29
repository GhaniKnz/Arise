"use client";

import { motion } from "motion/react";
import { ActivityCard, DayStateCard } from "@/components/dashboard/ActivityCards";
import { CaloriesCard } from "@/components/dashboard/CaloriesCard";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { StreakCard, TipCard, WeightTrendCard } from "@/components/dashboard/InsightCards";
import { QuestsCard } from "@/components/dashboard/QuestsCard";
import { WorkoutTodayCard } from "@/components/dashboard/WorkoutTodayCard";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } } };

export default function DashboardPage() {
  return (
    <motion.div className="grid grid-cols-1 gap-4 lg:grid-flow-row-dense lg:grid-cols-3 lg:gap-5" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
      <motion.div variants={item} className="lg:col-span-3">
        <HeroCard />
      </motion.div>
      <motion.div variants={item} className="lg:col-span-2">
        <GoalCard />
      </motion.div>
      <motion.div variants={item} className="lg:col-span-2">
        <CaloriesCard />
      </motion.div>
      <motion.div variants={item} className="lg:col-start-3 lg:row-span-2 lg:row-start-2">
        <QuestsCard />
      </motion.div>
      <motion.div variants={item}>
        <ActivityCard />
      </motion.div>
      <motion.div variants={item}>
        <DayStateCard />
      </motion.div>
      <motion.div variants={item} className="lg:col-span-2">
        <WorkoutTodayCard />
      </motion.div>
      <motion.div variants={item}>
        <WeightTrendCard />
      </motion.div>
      <motion.div variants={item}>
        <TipCard />
      </motion.div>
      <motion.div variants={item} className="lg:col-span-3">
        <StreakCard />
      </motion.div>
    </motion.div>
  );
}
