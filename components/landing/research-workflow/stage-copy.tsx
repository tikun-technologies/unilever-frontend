import { WORKFLOW_STAGES } from "./data"

export function WorkflowIntro() {
  return (
    <div
      data-workflow-intro
      className="absolute inset-0 z-30 flex flex-col items-center justify-center px-5 text-center"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#1a5f96]">
        From research to decision
      </p>
      <h2
        className="mt-5 text-5xl font-semibold leading-[0.94] tracking-tight text-slate-900 sm:text-6xl lg:text-8xl"
        style={{ letterSpacing: "-0.055em" }}
      >
        FROM RESEARCH
        <br />
        TO DECISION.
      </h2>
      <p className="mt-6 text-base leading-relaxed text-slate-500 sm:text-lg">
        Turn questions into evidence,
        <br />
        and evidence into decisions.
      </p>
    </div>
  )
}

export function StageCopy() {
  return (
    <div
      data-workflow-copy
      className="absolute inset-x-5 top-[10%] z-30 h-32 md:bottom-auto md:left-[6%] md:right-auto md:top-1/2 md:h-56 md:w-[28%] md:-translate-y-1/2 lg:left-[8%] lg:w-[24%]"
    >
      {WORKFLOW_STAGES.map((stage) => (
        <div
          key={stage.id}
          data-workflow-stage-copy={stage.id}
          className="absolute inset-0 opacity-0"
        >
          <div className="flex items-baseline gap-4 md:block">
            <span className="font-mono text-xs text-[#1a5f96] md:text-sm">{stage.number}</span>
            <h3
              className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:mt-4 md:text-6xl"
              style={{ letterSpacing: "-0.05em" }}
            >
              {stage.title}
            </h3>
          </div>
          <div className="mt-3 flex items-start gap-3 md:mt-5">
            <span className="mt-2 h-px w-8 shrink-0 bg-[#1a5f96]/45 md:w-12" />
            <p className="max-w-xs text-sm leading-relaxed text-slate-500 sm:text-base">
              {stage.description}
            </p>
          </div>
        </div>
      ))}

      <div
        data-workflow-progress
        className="absolute -bottom-2 left-0 flex items-center gap-2 md:bottom-0"
      >
        {WORKFLOW_STAGES.map((stage) => (
          <span
            key={stage.id}
            data-workflow-progress-segment={stage.id}
            className="h-px w-8 origin-left bg-slate-200 md:w-10"
          />
        ))}
      </div>
    </div>
  )
}

