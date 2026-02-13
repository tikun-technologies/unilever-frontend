"use client"

import React from "react"
import { motion } from "framer-motion"
import { transformAnalysisForView } from "@/lib/utils/analysisTransform"

interface AnalyticsHeatmapProps {
    analysisData: any
    activeMetric: string
    activeTab: string
    studyType?: string
    /** When provided with onElementClick, element names with a content URL are rendered as clickable (underline, pointer). */
    elementContentMap?: Record<string, string>
    onElementClick?: (contentUrl: string, elementName: string) => void
}

export const AnalyticsHeatmap: React.FC<AnalyticsHeatmapProps> = ({
    analysisData,
    activeMetric,
    activeTab,
    studyType,
    elementContentMap,
    onElementClick,
}) => {
    const { categories, columns } = transformAnalysisForView(analysisData || {}, activeMetric, activeTab)
    const isLayerStudy = (studyType || "").toLowerCase() === "layer"

    const getCellColor = (value: number) => {
        const v = Number(value)
        if (v === 0 || isNaN(v)) return "rgba(148, 163, 184, 0.5)"
        if (v < 0) return "#E11D48"
        // Response Time: lower is better (typically 0.2-2s)
        if (activeMetric === "Response Time") {
            if (v < 0.5) return "#22C55E"
            if (v < 1) return "#82E0AA"
            if (v < 2) return "#FCCD5B"
            return "#F7945A"
        }
        // Top Down / Bottom Up: higher is better
        if (v >= 20) return "#2674BA"
        if (v >= 10) return "#22C55E"
        return "#82E0AA"
    }

    if (!analysisData || categories.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center text-gray-500">
                <p>No analysis data. Load analysis.json for {activeMetric} / {activeTab}.</p>
            </div>
        )
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    }

    return (
        <div className="space-y-12 pb-12">
            {categories.map((category) => {
                const sectionColumns = category.columns || columns
                return (
                    <div key={category.title} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">{isLayerStudy ? `Layer: ${category.title}` : category.title}</h2>
                            <div className="flex items-center gap-4 text-xs flex-wrap">
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(148, 163, 184, 0.5)" }} /> Low / Zero</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#82E0AA" }} /> Low+</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#22C55E" }} /> Medium</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#2674BA" }} /> High</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#E11D48" }} /> Negative</div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-8">
                            <div className="flex flex-col md:flex-row">
                                {/* Left Column: Responses */}
                                <div className="w-full md:w-[30%] space-y-1 md:pr-6 md:pt-10 mb-4 md:mb-0">
                                    {category.data.map((row, i) => {
                                        const contentUrl = elementContentMap?.[`${category.title}|${row.response}`]
                                        const hasContent = !!contentUrl && contentUrl.startsWith("http")
                                        return (
                                            <div key={i} className="h-12 md:h-24 flex items-center md:justify-end md:text-right">
                                                {hasContent && onElementClick ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onElementClick(contentUrl, String(row.response))}
                                                        className="text-[10px] md:text-xs font-bold leading-tight md:max-w-[200px] underline cursor-pointer text-left hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#2674BA]/30 rounded"
                                                        style={{ color: "#2674BA" }}
                                                    >
                                                        {row.response}
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] md:text-xs font-bold text-gray-800 leading-tight md:max-w-[200px]">{row.response}</span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Heatmap Grid Wrapper for potential horizontal scrolling */}
                                <div className="flex-1 overflow-x-auto scrollbar-hide">
                                    <div className="min-w-[400px] md:min-w-0">
                                        {/* Column Headers */}
                                        <div className="flex">
                                            {sectionColumns.map((col) => (
                                                <div key={col.key} className="flex-1 text-center py-2 text-[10px] md:text-xs font-semibold text-gray-500">
                                                    <div>{col.label}</div>
                                                    {col.subLabel && <div className="text-[8px] md:text-[10px] text-gray-400 font-normal">{col.subLabel}</div>}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Rows */}
                                        <motion.div
                                            variants={containerVariants}
                                            initial="hidden"
                                            animate="visible"
                                            key={`${activeTab}-${category.title}`}
                                            className="space-y-1"
                                        >
                                            {category.data.map((row, rowIndex) => (
                                                <div key={rowIndex} className="flex gap-1 h-12 md:h-24">
                                                    {sectionColumns.map((col, colIndex) => {
                                                        const val = Number(row[col.key] ?? 0)
                                                        const display = typeof row[col.key] === "number" && (row[col.key] as number) % 1 !== 0
                                                            ? (row[col.key] as number).toFixed(3)
                                                            : val
                                                        return (
                                                            <motion.div
                                                                key={col.key}
                                                                variants={itemVariants}
                                                                whileHover={{ scale: 1.02, filter: "brightness(1.1)", cursor: "pointer" }}
                                                                className="flex-1 rounded-sm flex items-center justify-center text-white font-bold text-xs md:text-sm transition-all duration-300"
                                                                style={{ backgroundColor: getCellColor(val) }}
                                                            >
                                                                {display}
                                                            </motion.div>
                                                        )
                                                    })}
                                                </div>
                                            ))}
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
