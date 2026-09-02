import { getBrand } from "@/lib/config/brand"
import { PROPOSITIONS, RESEARCH_QUESTION, RESPONSE_SIGNALS } from "./data"

const mobileSignalPositions = [
  "left-[52%] top-[45%]",
  "left-[52%] top-[49%]",
  "left-[52%] top-[58%]",
  "left-[52%] top-[62%]",
  "left-[52%] top-[71%]",
  "left-[52%] top-[75%]",
]

export function ResearchCanvas() {
  const brand = getBrand()

  return (
    <div
      data-workflow-canvas
      className="absolute inset-x-5 bottom-[8%] top-[32%] z-20 overflow-hidden border-t border-slate-200/80 opacity-0 md:bottom-[8%] md:left-[36%] md:right-[5%] md:top-[12%] md:border-y lg:right-[7%]"
    >
      <div className="absolute left-0 top-3 bg-white pr-2 font-mono text-[9px] tracking-[0.18em] text-slate-300 md:top-0">
        {brand.displayName.toUpperCase()} / RESEARCH FLOW
      </div>
      <div className="absolute right-0 top-3 bg-white pl-2 font-mono text-[9px] tabular-nums text-slate-300 md:top-0">
        LIVE EVIDENCE
      </div>

      <ResearchQuestion />
      <StimulusPaths />
      <PropositionField />
      <ResponseField />
      <PatternField />
      <DecisionResult />
    </div>
  )
}

function ResearchQuestion() {
  return (
    <div
      data-workflow-question
      className="absolute left-1/2 top-[34%] z-20 w-[min(92%,38rem)] -translate-x-1/2 md:top-[9%]"
    >
      <div className="flex items-start border-b border-slate-300 pb-4">
        <span className="mr-4 mt-1 font-mono text-[10px] text-[#1a5f96]">Q–01</span>
        <p className="max-w-lg text-left text-lg font-medium leading-snug tracking-tight text-slate-800 sm:text-xl lg:text-2xl">
          {RESEARCH_QUESTION}
        </p>
        <span
          data-workflow-lock
          className="ml-auto mt-1 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-300 opacity-0"
        >
          Defined
        </span>
      </div>
    </div>
  )
}

function StimulusPaths() {
  return (
    <>
      <svg
        data-workflow-lines="desktop"
        className="absolute inset-0 hidden h-full w-full md:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth=".18"
        aria-hidden
      >
        <path data-workflow-stimulus-path d="M50 25 C43 32 29 35 18 43" />
        <path data-workflow-stimulus-path d="M50 25 L50 43" />
        <path data-workflow-stimulus-path d="M50 25 C57 32 71 35 82 43" />

        <path data-workflow-decode-path d="M10 61 C25 59 37 57 48 58" />
        <path data-workflow-decode-path d="M24 73 C33 67 41 62 49 59" />
        <path data-workflow-decode-path d="M41 65 C44 62 47 60 49 59" />
        <path data-workflow-decode-path d="M57 76 C55 69 53 63 51 59" />
        <path data-workflow-decode-path d="M73 64 C64 62 58 60 51 59" />
        <path data-workflow-decode-path d="M89 73 C73 67 63 62 52 59" />
      </svg>

      <svg
        data-workflow-lines="mobile"
        className="hidden"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth=".22"
        aria-hidden
      >
        <path data-workflow-stimulus-path d="M50 27 L50 35 L14 39" />
        <path data-workflow-stimulus-path d="M50 35 L14 50" />
        <path data-workflow-stimulus-path d="M50 35 L14 61" />

        <path data-workflow-decode-path d="M8 69 C28 66 40 61 49 57" />
        <path data-workflow-decode-path d="M92 69 C72 66 60 61 51 57" />
        <path data-workflow-decode-path d="M8 78 C29 70 41 63 49 58" />
        <path data-workflow-decode-path d="M92 78 C71 70 59 63 51 58" />
        <path data-workflow-decode-path d="M8 87 C28 76 40 66 49 59" />
        <path data-workflow-decode-path d="M92 87 C72 76 60 66 51 59" />
      </svg>
    </>
  )
}

function PropositionField() {
  return (
    <>
      <div data-workflow-layout="desktop" className="hidden md:block">
        {PROPOSITIONS.map((item, index) => (
          <Proposition
            key={item.id}
            item={item}
            className={`${index === 0 ? "left-[18%]" : index === 1 ? "left-1/2" : "left-[82%]"} top-[41%] -translate-x-1/2`}
          />
        ))}
      </div>
      <div data-workflow-layout="mobile" className="md:hidden">
        {PROPOSITIONS.map((item, index) => (
          <Proposition
            key={item.id}
            item={item}
            className={`left-[5%] ${index === 0 ? "top-[45%]" : index === 1 ? "top-[58%]" : "top-[71%]"}`}
          />
        ))}
      </div>
    </>
  )
}

function Proposition({
  item,
  className,
}: {
  item: (typeof PROPOSITIONS)[number]
  className: string
}) {
  return (
    <div
      data-workflow-proposition
      data-proposition={item.id}
      data-winner={"winner" in item && item.winner ? "true" : "false"}
      className={`absolute z-20 flex items-baseline gap-3 opacity-0 ${className}`}
    >
      <span className="font-mono text-[10px] text-slate-300">{item.letter}</span>
      <span
        data-workflow-proposition-label
        className="text-sm font-semibold tracking-[0.16em] text-slate-700 sm:text-base"
      >
        {item.label}
      </span>
      <span
        data-workflow-proposition-score
        className="hidden font-mono text-[9px] tabular-nums text-[#1a5f96] opacity-0 md:inline"
      >
        +18
      </span>
    </div>
  )
}

function ResponseField() {
  return (
    <>
      <div data-workflow-layout="desktop" className="hidden md:block">
        {RESPONSE_SIGNALS.map((signal) => (
          <ResponseSignal
            key={signal.id}
            signal={signal}
            style={{ left: `${signal.x}%`, top: `${signal.y}%` }}
          />
        ))}
      </div>
      <div data-workflow-layout="mobile" className="md:hidden">
        {RESPONSE_SIGNALS.map((signal, index) => (
          <ResponseSignal
            key={signal.id}
            signal={signal}
            className={mobileSignalPositions[index]}
          />
        ))}
      </div>
    </>
  )
}

function ResponseSignal({
  signal,
  className = "",
  style,
}: {
  signal: (typeof RESPONSE_SIGNALS)[number]
  className?: string
  style?: { left: string; top: string }
}) {
  return (
    <div
      data-workflow-response
      data-response={signal.id}
      data-source-x={signal.x}
      data-source-y={signal.y}
      className={`absolute z-10 flex items-center gap-2 opacity-0 ${className}`}
      style={style}
    >
      <span className="h-1.5 w-1.5 rounded-full border border-[#1a5f96]/60 bg-white" />
      <span className="whitespace-nowrap text-[10px] text-slate-500 sm:text-[11px]">
        {signal.text}
      </span>
    </div>
  )
}

function PatternField() {
  return (
    <div
      data-workflow-pattern
      className="absolute left-1/2 top-[57%] z-30 w-[min(88%,25rem)] -translate-x-1/2 -translate-y-1/2 opacity-0"
    >
      <div className="relative mx-auto h-28 w-28 sm:h-36 sm:w-36">
        <span className="absolute inset-0 rounded-full border border-slate-200" />
        <span className="absolute inset-[18%] rounded-full border border-[#1a5f96]/25" />
        <span className="absolute left-1/2 top-0 h-full w-px bg-slate-200" />
        <span className="absolute left-0 top-1/2 h-px w-full bg-slate-200" />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/75">
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Primary driver
          </span>
          <span className="mt-2 text-xl font-semibold tracking-[0.16em] text-[#1a5f96] sm:text-2xl">
            TRUST
          </span>
        </div>
      </div>
      <p
        data-workflow-insight
        className="mx-auto mt-5 max-w-sm text-center text-sm font-medium leading-relaxed text-slate-700 opacity-0 sm:text-base"
      >
        “Trust is driving preference more than functionality.”
      </p>
    </div>
  )
}

function DecisionResult() {
  return (
    <div
      data-workflow-decision
      className="absolute inset-x-3 bottom-[7%] z-40 text-center opacity-0 md:bottom-[8%]"
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        Evidence → insight → decision
      </p>
      <p
        className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
        style={{ letterSpacing: "-0.04em" }}
      >
        LEAD WITH <span className="text-[#1a5f96]">TRUST.</span>
      </p>
    </div>
  )
}

