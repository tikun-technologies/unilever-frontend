import type { Metadata } from "next"
import { getPublicPreviewDetails } from "@/lib/api/StudyAPI"
import PreviewPageClient from "./PreviewPageClient"

type PageProps = {
  searchParams?: Promise<{ studyId?: string | string[] }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams
  const rawStudyId = resolvedSearchParams?.studyId
  const studyId = Array.isArray(rawStudyId) ? rawStudyId[0] : rawStudyId

  if (!studyId) {
    return {
      title: "Study Preview",
      description: "Preview this study before sharing.",
    }
  }

  try {
    const study = await getPublicPreviewDetails(studyId)
    const title = study?.title?.trim() || "Study Preview"
    const description = "Preview this study before sharing."
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    const url = `${appUrl}/home/create-study/preview?studyId=${encodeURIComponent(studyId)}`

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
      title: "Study Preview",
      description: "Preview this study before sharing.",
    }
  }
}

export default function ParticipateIntroPage() {
  return <PreviewPageClient />
}
