import { WORKFLOW_STAGES } from "./data"

export function ReducedWorkflow() {
  return (
    <div
      data-workflow-reduced
      className="mx-auto hidden w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#1a5f96]">
        From research to decision
      </p>
      <h2
        className="mt-4 text-4xl font-semibold leading-none tracking-tight text-slate-900 sm:text-6xl"
        style={{ letterSpacing: "-0.05em" }}
      >
        FROM RESEARCH TO DECISION.
      </h2>
      <p className="mt-5 text-base leading-relaxed text-slate-500 sm:text-lg">
        Turn questions into evidence,
        <br />
        and evidence into decisions.
      </p>

      <div className="mt-14 grid gap-8 md:grid-cols-4 md:gap-6">
        {WORKFLOW_STAGES.map((stage) => (
          <div key={stage.id} className="border-t border-slate-200 pt-4">
            <span className="font-mono text-xs text-[#1a5f96]">{stage.number}</span>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              {stage.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{stage.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 border-y border-slate-200 py-8 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          Primary driver · Trust
        </p>
        <p className="mt-3 text-lg font-medium text-slate-700">
          “Trust is driving preference more than functionality.”
        </p>
        <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">
          LEAD WITH <span className="text-[#1a5f96]">TRUST.</span>
        </p>
      </div>
    </div>
  )
}

