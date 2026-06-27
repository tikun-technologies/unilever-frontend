import { ArrowRight } from "lucide-react"

export interface CaseStudyData {
  category: string
  title: string
  description: string
  result: string
  resultLabel: string
}

export function CaseStudyCard({ category, title, description, result, resultLabel }: CaseStudyData) {
  return (
    <div
      className="case-study-card relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white will-change-transform"
      style={{ boxShadow: "0 4px 24px -4px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {/* Blue accent line – GSAP animates width from 0 → 100% when active */}
      <div className="case-study-accent absolute top-0 left-0 h-[3px] w-0 z-10 bg-[#1a5f96] rounded-t-[24px]" />

      {/* Content */}
      <div className="flex flex-1 flex-col justify-start gap-4 p-4 pb-8 sm:justify-between sm:gap-0 sm:p-8 md:p-10">
        <div>
          {/* Badge */}
          <div className="mb-3 sm:mb-6">
            <span className="inline-block rounded-full border border-[#1a5f96]/25 bg-[#1a5f96]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#1a5f96] sm:text-[11px]">
              {category}
            </span>
          </div>

          {/* Title */}
          <h3
            className="mb-2 text-xl font-bold tracking-tight text-slate-900 sm:mb-4 sm:text-2xl md:text-3xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            {title}
          </h3>

          {/* Description */}
          <p className="max-h-[84px] overflow-hidden text-sm leading-relaxed text-slate-500 sm:max-h-none sm:text-base md:text-lg">
            {description}
          </p>
        </div>

        {/* Result + CTA */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:mt-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pt-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-[11px]">
              {resultLabel}
            </p>
            <p className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {result}
            </p>
          </div>
          <button className="group flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-[#1a5f96] hover:bg-[#1a5f96] hover:text-white sm:w-auto">
            Read case study
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
