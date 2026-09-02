export function DecisionReveal() {
  return (
    <div
      data-problem-final
      className="pointer-events-none absolute inset-0 z-50 px-5 text-center opacity-0"
    >
      <div className="absolute inset-x-5 top-[59%] md:top-[58%]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1a5f96]">
          One business decision
        </p>
        <h3
          className="mt-3 text-4xl font-semibold leading-[0.98] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
          style={{ letterSpacing: "-0.05em" }}
        >
          WHICH ONE SHOULD
          <br />
          YOUR BRAND LEAD WITH?
        </h3>
        <p
          data-problem-final-support
          className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-slate-500 opacity-0 sm:text-base"
        >
          That&apos;s where understanding people changes the decision.
        </p>
        <div
          data-problem-final-scroll
          className="mt-5 flex flex-col items-center gap-2 opacity-0 sm:mt-7"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Scroll to see how
          </span>
          <span className="h-8 w-px bg-[#1a5f96]/35" />
        </div>
      </div>
    </div>
  )
}

