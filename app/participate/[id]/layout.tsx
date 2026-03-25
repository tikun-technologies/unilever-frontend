import type { Metadata } from "next"
import { getStudyDetailsWithoutAuth } from "@/lib/api/StudyAPI"
import { ParticipateStudyDocumentTitle } from "@/components/participate/ParticipateStudyDocumentTitle"

type LayoutProps = {
  children: React.ReactNode;
};

type Params = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id: studyId } = await params;
  try {
    const study = await getStudyDetailsWithoutAuth(studyId);
    const titleBase = study?.title || "Study"
    const title = `${titleBase} · MindSurve`
    const description = "Participate in this study.";
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const url = `${appUrl}/participate/${studyId}`;

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
    };
  } catch {
    return {
      title: "Study · MindSurve",
      description: "Participate in this study.",
    }
  }
}

export default function ParticipateLayout({ children }: LayoutProps) {
  return (
    <section>
      <ParticipateStudyDocumentTitle />
      {children}
    </section>
  )
}


