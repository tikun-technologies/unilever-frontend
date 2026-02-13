"use client"

import React from "react"
import { motion } from "framer-motion"
import { Users, Clock, Star, Layers } from "lucide-react"
import { getKPIStats } from "@/lib/utils/analysisDashboard"

const CARD_COLORS = ["#2674BA", "#22C55E", "#F7945A", "#FCCD5B"]

interface AnalyticsKPICardsProps {
  analysisData: any
  rawDataOverride?: any[]
  studyType?: string
}

export function AnalyticsKPICards({ analysisData, rawDataOverride, studyType }: AnalyticsKPICardsProps) {
  const stats = getKPIStats(analysisData || {}, rawDataOverride)
  const isLayerStudy = (studyType || "").toLowerCase() === "layer"

  const cards = [
    { title: "Total Respondents", value: stats.totalRespondents, icon: Users, color: CARD_COLORS[0] },
    {
      title: "Avg Response Time(Tasks)",
      value: stats.avgResponseTime > 0 ? `${(stats.avgResponseTime * 1000).toFixed(0)}ms` : "-",
      icon: Clock,
      color: CARD_COLORS[1],
    },
    {
      title: "Avg Rating",
      value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "-",
      icon: Star,
      color: CARD_COLORS[2],
    },
    { title: isLayerStudy ? "Layers" : "Categories", value: stats.categoryCount, icon: Layers, color: CARD_COLORS[3] },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          whileHover={{ y: -4, boxShadow: "0 12px 40px -12px rgba(0,0,0,0.15)" }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${card.color}20`, color: card.color }}
            >
              <card.icon className="w-6 h-6" strokeWidth={2} />
            </div>
          </div>
          <div className="h-1 w-full" style={{ backgroundColor: `${card.color}40` }} />
        </motion.div>
      ))}
    </div>
  )
}
