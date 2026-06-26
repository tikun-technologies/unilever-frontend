import Image from "next/image"
import { ArrowRight } from "lucide-react"

export interface CaseStudyProps {
  title: string
  description: string
  result: string
  category: string
  image: string
}

export function CaseStudyCard({ title, description, result, category, image }: CaseStudyProps) {
  return (
    <div className="case-study-card group relative flex w-[85vw] shrink-0 snap-center flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl md:w-[40vw] lg:w-[30vw] max-w-[400px]">
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#1a5f96]">
          {category}
        </div>
        <h3 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Business Outcome</div>
            <div className="text-lg font-bold text-slate-900">{result}</div>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-[#1a5f96] transition-colors group-hover:bg-[#1a5f96] group-hover:text-white">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
