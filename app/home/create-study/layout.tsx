import { studyFontVariables } from "@/lib/fonts/studyFonts"

export default function CreateStudyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={`${studyFontVariables} min-h-full`}>{children}</div>
}
