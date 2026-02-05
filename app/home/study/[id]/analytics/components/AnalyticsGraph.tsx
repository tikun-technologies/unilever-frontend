"use client"

import React from "react"
import { motion } from "framer-motion"
import { transformAnalysisForView } from "@/lib/utils/analysisTransform"

interface AnalyticsGraphProps {
    analysisData: any
    activeMetric: string
    activeTab: string
}

const COLORS = [
    "#2674BA",
    "#82E0AA",
    "#FCCD5B",
    "#F7945A",
    "#C04E35",
    "#BB8FCE",
]

export const AnalyticsGraph: React.FC<AnalyticsGraphProps> = ({ analysisData, activeMetric, activeTab }) => {
    const { categories, columns } = transformAnalysisForView(analysisData || {}, activeMetric, activeTab)

    if (!analysisData || categories.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center text-gray-500">
                <p>No analysis data. Load analysis.json for {activeMetric} / {activeTab}.</p>
            </div>
        )
    }

    // Determine dynamic width based on data density
    const isDense = activeTab === "Prelim" || columns.length > 5
    const cardMinWidth = isDense ? "min-w-[600px] md:min-w-[800px]" : "min-w-[400px]"

    return (
        <div className="w-full space-y-12 pb-12">
            {categories.map((category) => {
                const sectionColumns = category.columns || columns
                return (
                    <div key={category.title} className="space-y-6">
                        <div className="flex items-center gap-3 px-1">
                            <div className="h-8 w-1.5 rounded-full bg-[#2674BA]" />
                            <h2 className="text-xl font-bold text-gray-800">
                                {category.title}
                            </h2>
                            <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {category.data.length} Elements
                            </span>
                        </div>

                        {/* Horizontal scrollable container for elements in this category */}
                        <div className="flex overflow-x-auto pb-6 -mx-1 px-1 gap-6 scroll-smooth thin-scrollbar">
                            {category.data.map((row, rowIndex) => {
                                const rowValues = sectionColumns.map((col) => Number(row[col.key] ?? 0))
                                const hasNegatives = rowValues.some((v) => v < 0)
                                const maxVal = Math.max(0, ...rowValues)
                                const minVal = hasNegatives ? Math.min(...rowValues) : 0

                                // Strictly zero-based range
                                const yMin = hasNegatives ? Math.min(0, minVal * 1.1) : 0
                                const yMax = Math.max(maxVal * 1.1, 1)
                                const yRange = yMax - yMin || 1

                                const yLabels = [
                                    yMax.toFixed(1),
                                    (yMin + yRange * 0.75).toFixed(1),
                                    (yMin + yRange * 0.5).toFixed(1),
                                    (yMin + yRange * 0.25).toFixed(1),
                                    yMin.toFixed(1),
                                ]

                                return (
                                    <div
                                        key={rowIndex}
                                        className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow shrink-0 ${cardMinWidth}`}
                                    >
                                        <h3 className="text-sm font-bold text-gray-700 mb-8 whitespace-normal break-words leading-relaxed min-h-[3rem]">
                                            {row.response}
                                        </h3>

                                        <div className="flex gap-4 flex-1 items-start">
                                            {/* Y-axis */}
                                            <div className="flex flex-col justify-between items-end shrink-0 w-12 pr-2 border-r border-gray-200 relative h-[250px]">
                                                {yLabels.map((label, i) => (
                                                    <span key={i} className="text-[10px] font-semibold text-gray-500 tabular-nums">
                                                        {label}
                                                    </span>
                                                ))}
                                                {/* Axis Label */}
                                                <div className="absolute -left-5 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                                    Values
                                                </div>
                                            </div>

                                            {/* Chart and Labels Container */}
                                            <div className="flex-1 min-w-0 relative">
                                                {/* Horizontal Grid Lines */}
                                                <div className="absolute top-0 left-0 right-0 h-[250px] pointer-events-none flex flex-col justify-between">
                                                    {[0, 1, 2, 3, 4].map((i) => (
                                                        <div key={i} className="w-full h-px bg-gray-100" />
                                                    ))}
                                                </div>

                                                {/* Vertical Columns (Bar + Label) */}
                                                <div className="relative z-10 flex w-full">
                                                    {sectionColumns.map((col, colIndex) => {
                                                        const val = Number(row[col.key] ?? 0)
                                                        const pctHeight = (Math.abs(val) / yRange) * 100
                                                        const isPositive = val >= 0

                                                        return (
                                                            <div
                                                                key={col.key}
                                                                className="flex-1 flex flex-col items-center group min-w-0"
                                                            >
                                                                {/* Bar Area */}
                                                                <div className="relative w-full h-[250px]">
                                                                    {/* Tooltip */}
                                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-lg font-bold">
                                                                        {col.label}: {val.toFixed(3)}
                                                                    </div>

                                                                    {/* Zero line (X-axis) - only inside the bar area */}
                                                                    <div
                                                                        className="absolute left-0 right-0 h-0.5 bg-gray-400 z-10"
                                                                        style={{ bottom: `${((0 - yMin) / yRange) * 100}%` }}
                                                                    />

                                                                    <div className="w-full h-full relative flex items-center justify-center">
                                                                        <motion.div
                                                                            initial={{ height: 0 }}
                                                                            animate={{ height: `${pctHeight}%` }}
                                                                            transition={{ duration: 0.6, delay: colIndex * 0.04, ease: "easeOut" }}
                                                                            className={`w-[20px] sm:w-[28px] md:w-[36px] z-0 ${isPositive ? "rounded-t-sm" : "rounded-b-sm"}`}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                [isPositive ? "bottom" : "top"]: `${isPositive ? ((0 - yMin) / yRange) * 100 : 100 - ((0 - yMin) / yRange) * 100}%`,
                                                                                backgroundColor: val < 0 ? "#E11D48" : COLORS[colIndex % COLORS.length],
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Label Area */}
                                                                <div className="mt-4 w-full px-1">
                                                                    <div
                                                                        className="text-[10px] font-bold text-gray-700 text-center break-words leading-tight w-full hover:bg-gray-50 rounded p-1 transition-colors"
                                                                        title={col.label}
                                                                    >
                                                                        {col.label}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
