import type { Metadata } from "next"
import { getPublicProjectStudies } from "@/api/projectApi"

type Props = {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  try {
    const data = await getPublicProjectStudies(projectId)
    const name = data?.project_name?.trim() || "Project"
    return {
      title: `${name} · MindSurve`,
      description: "Choose a project to participate.",
    }
  } catch {
    return {
      title: "Project · MindSurve",
      description: "Project participant listing.",
    }
  }
}

export default function ParticipateProjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
