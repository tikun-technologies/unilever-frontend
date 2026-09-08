"use client"

import { useParams } from "next/navigation"
import { StudyAnalyticsDashboard } from "./StudyAnalyticsDashboard"

export default function StudyAnalyticsPage() {
    const params = useParams()
    const studyId = params.id as string
    return <StudyAnalyticsDashboard studyId={studyId} />
}
