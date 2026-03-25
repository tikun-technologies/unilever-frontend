import { PreviewParticipateDocumentTitle } from "@/components/create-study/preview/PreviewParticipateDocumentTitle"

export default function CreateStudyPreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PreviewParticipateDocumentTitle />
      {children}
    </>
  )
}
