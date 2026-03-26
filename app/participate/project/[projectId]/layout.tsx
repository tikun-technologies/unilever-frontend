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
    const title = data?.project_name?.trim() || "Project"
    const description = "Choose a project to participate."
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    const url = `${appUrl}/participate/project/${projectId}`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: url || undefined,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    }
  } catch {
    return {
      title: "Project",
      description: "Project participant listing.",
    }
  }
}

export default function ParticipateProjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
