"use client"

import React from "react"
import { transformAnalysisForView } from "@/lib/utils/analysisTransform"

interface AnalyticsTableProps {
    analysisData: any
    activeMetric: string
    activeTab: string
}

export const AnalyticsTable: React.FC<AnalyticsTableProps> = ({ analysisData, activeMetric, activeTab }) => {
    const { categories, columns } = transformAnalysisForView(analysisData || {}, activeMetric, activeTab)

    if (!analysisData || categories.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center text-gray-500">
                <p>No analysis data. Load analysis.json for {activeMetric} / {activeTab}.</p>
            </div>
        )
    }

    return (
        <div className="space-y-12 pb-12">
            {categories.map((category) => {
                const sectionColumns = category.columns || columns
                return (
                    <div key={category.title} className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 text-left">{category.title}</h2>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-4 md:px-6 py-4 font-medium text-gray-500 min-w-[200px] md:w-[40%]">Response</th>
                                            {sectionColumns.map((col) => (
                                                <th key={col.key} className="px-6 py-4 font-medium text-gray-500">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-900 font-semibold">{col.label}</span>
                                                        {col.subLabel && <span className="text-xs text-gray-400 mt-0.5">{col.subLabel}</span>}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {category.data.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 md:px-6 py-4 text-gray-700 font-medium text-xs md:text-sm">
                                                    {row.response}
                                                </td>
                                                {sectionColumns.map((col) => (
                                                    <td key={col.key} className="px-6 py-4 text-gray-900 font-medium">
                                                        {row[col.key] !== undefined ? row[col.key] : "-"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
