"use client";

import Link from "next/link";
import { CalendarDays, ShoppingCart, Flame, BookOpen, Globe } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function HubPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-display font-bold text-surface-300 mb-8">Hub</h1>
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
      >
        {/* Meal Prep */}
        <Link href="/dashboard/meal-prep">
          <motion.div variants={item} className="bg-surface-900 border border-surface-700 rounded-2xl p-6 h-full hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col items-start text-left">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <CalendarDays className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg text-surface-300 mb-1">Meal Prep</h3>
            <p className="text-sm text-surface-500">Plan your weekly meals</p>
          </motion.div>
        </Link>

        {/* Cookbooks */}
        <Link href="/dashboard">
          <motion.div variants={item} className="bg-surface-900 border border-surface-700 rounded-2xl p-6 h-full hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col items-start text-left">
            <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-lg text-surface-300 mb-1">Cookbooks</h3>
            <p className="text-sm text-surface-500">Organize your recipes</p>
          </motion.div>
        </Link>

        {/* Shopping List */}
        <Link href="/dashboard/shopping-list">
          <motion.div variants={item} className="bg-surface-900 border border-surface-700 rounded-2xl p-6 h-full hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col items-start text-left">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <ShoppingCart className="w-7 h-7 text-rose-600" />
            </div>
            <h3 className="font-semibold text-lg text-surface-300 mb-1">Shopping List</h3>
            <p className="text-sm text-surface-500">Smart grocery lists</p>
          </motion.div>
        </Link>

        {/* Calorie Counter (Coming Soon) */}
        <motion.div variants={item} className="bg-surface-900 border border-surface-700 rounded-2xl p-6 h-full opacity-60 flex flex-col items-start text-left relative overflow-hidden">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
            <Flame className="w-7 h-7 text-amber-600" />
          </div>
          <h3 className="font-semibold text-lg text-surface-300 mb-1">Calorie Counter</h3>
          <p className="text-sm text-surface-500 mb-3">Track your nutrition</p>
          <div className="mt-auto">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-800 text-surface-500">
              Coming Soon
            </span>
          </div>
        </motion.div>

        {/* Community */}
        <Link href="/dashboard/community">
          <motion.div variants={item} className="bg-surface-900 border border-surface-700 rounded-2xl p-6 h-full hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col items-start text-left">
            <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Globe className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="font-semibold text-lg text-surface-300 mb-1">Community</h3>
            <p className="text-sm text-surface-500">Shared by the SnapRecipes world</p>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
