import { PERCEPTIONS } from "./data"

export function PerceptionTransition() {
  return (
    <div
      data-problem-perception
      className="pointer-events-none absolute inset-0 z-40 opacity-0"
    >
      <div className="absolute inset-x-0 top-[11%] text-center md:top-[8%]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1a5f96]">
          Same product
        </p>
        <h3
          className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
          style={{ letterSpacing: "-0.05em" }}
        >
          DIFFERENT PERCEPTION.
        </h3>
      </div>

      <svg
        data-problem-perception-lines="desktop"
        className="absolute inset-0 hidden h-full w-full md:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path data-problem-perception-path d="M42 58 C33 59 25 63 18 68" fill="none" stroke="#94a3b8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-perception-path d="M50 69 L50 70.5" fill="none" stroke="#1a5f96" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
        <path data-problem-perception-path d="M58 58 C67 59 75 63 82 68" fill="none" stroke="#94a3b8" strokeWidth="1" vectorEffect="non-scaling-stroke" />

        <path data-problem-decision-path d="M18 75 C14 79 11 84 9 90" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-decision-path d="M50 79 L50 82.5" fill="none" stroke="#1a5f96" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-decision-path d="M50 89.5 L50 92" fill="none" stroke="#1a5f96" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-decision-path d="M82 75 C86 79 89 84 91 90" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>

      <svg
        data-problem-perception-lines="mobile"
        className="hidden"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path data-problem-perception-path d="M38 54 C30 58 24 62 17 65" fill="none" stroke="#94a3b8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-perception-path d="M38 55 C29 63 23 70 17 75" fill="none" stroke="#1a5f96" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
        <path data-problem-perception-path d="M38 56 C29 69 23 78 17 85" fill="none" stroke="#94a3b8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="hidden md:block">
        {PERCEPTIONS.map((item) => (
          <div
            key={item.id}
            data-problem-perception-node
            data-perception={item.id}
            className={`absolute w-64 -translate-x-1/2 text-center opacity-0 ${
              item.id === "premium"
                ? "left-[18%] top-[67%]"
                : item.id === "trusted"
                  ? "left-1/2 top-[72%]"
                  : "left-[82%] top-[67%]"
            }`}
          >
            <p data-problem-perception-signal className="text-lg font-semibold tracking-[0.16em] text-slate-800">
              {item.signal}
            </p>
            <p data-problem-perception-meaning className="mt-2 text-xs font-medium tracking-[0.08em] text-[#1a5f96]">
              {item.meaning}
            </p>
            <p
              data-problem-perception-decision
              className="absolute left-1/2 top-[6.5rem] w-max -translate-x-1/2 text-base font-medium tracking-tight text-slate-700 opacity-0"
            >
              “{item.decision}”
            </p>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-5 top-[63%] space-y-4 md:hidden">
        {PERCEPTIONS.map((item) => (
          <div
            key={item.id}
            data-problem-perception-node
            data-perception={item.id}
            className="relative flex h-12 items-center border-b border-slate-200 opacity-0"
          >
            <p data-problem-perception-signal className="w-[7.5rem] text-left text-sm font-semibold tracking-[0.14em] text-slate-800">
              {item.signal}
            </p>
            <span className="h-px flex-1 bg-slate-200" />
            <p data-problem-perception-meaning className="w-[5.5rem] text-right text-xs font-medium text-[#1a5f96]">
              {item.meaning}
            </p>
            <p
              data-problem-perception-decision
              className="absolute inset-0 flex items-center justify-center bg-slate-50 text-base font-medium tracking-tight text-slate-700 opacity-0"
            >
              “{item.decision}”
            </p>
          </div>
        ))}
      </div>

      <p
        data-problem-decision-caption
        className="absolute inset-x-5 bottom-[5%] text-center text-sm text-slate-500 opacity-0 sm:text-base"
      >
        Different perception. Different decision.
      </p>
    </div>
  )
}

