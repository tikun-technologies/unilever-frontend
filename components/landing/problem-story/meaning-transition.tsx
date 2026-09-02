import { BENEFIT_MEANINGS } from "./data"

const desktopPositions = [
  "left-[6%] top-[27%]",
  "right-[6%] top-[27%]",
  "left-[7%] top-[73%]",
  "right-[7%] top-[73%]",
]

const mobilePositions = [
  "left-[4%] top-[64%]",
  "right-[4%] top-[64%]",
  "left-[4%] top-[81%]",
  "right-[4%] top-[81%]",
]

export function MeaningTransition() {
  return (
    <div data-problem-meanings className="pointer-events-none absolute inset-0 z-30">
      <div
        data-problem-many-title
        className="absolute inset-x-0 top-[11%] text-center opacity-0 md:top-[8%]"
      >
        <h3
          className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
          style={{ letterSpacing: "-0.05em" }}
        >
          MANY MEANINGS.
        </h3>
        <p className="mt-3 text-xs text-slate-400 sm:text-sm">
          The meaning changes around it.
        </p>
      </div>

      <svg
        data-problem-meaning-lines="desktop"
        className="absolute inset-0 hidden h-full w-full md:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path data-problem-meaning-path="hydrates" d="M47 51 C38 45 31 36 22 31" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-meaning-path="protects" d="M53 51 C62 45 69 36 78 31" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-meaning-path="revives" d="M47 59 C37 63 30 69 22 76" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-meaning-path="nourishes" d="M53 59 C63 63 70 69 78 76" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>

      <svg
        data-problem-meaning-lines="mobile"
        className="hidden"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path data-problem-meaning-path="hydrates" d="M46 51 C35 55 26 59 20 66" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-meaning-path="protects" d="M54 51 C65 55 74 59 80 66" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-meaning-path="revives" d="M46 53 C34 63 26 72 20 83" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path data-problem-meaning-path="nourishes" d="M54 53 C66 63 74 72 80 83" fill="none" stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>

      {BENEFIT_MEANINGS.map((item, index) => (
        <div key={item.id}>
          <MeaningNode item={item} className={`hidden md:block ${desktopPositions[index]}`} />
          <MeaningNode item={item} className={`md:hidden ${mobilePositions[index]}`} />
        </div>
      ))}
    </div>
  )
}

function MeaningNode({
  item,
  className,
}: {
  item: (typeof BENEFIT_MEANINGS)[number]
  className: string
}) {
  return (
    <div
      data-problem-meaning
      data-meaning={item.id}
      className={`absolute w-[42%] opacity-0 md:w-[17rem] ${className}`}
    >
      <div className="relative h-12 overflow-hidden text-center md:h-14">
        <p
          data-problem-benefit
          className="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-[0.18em] text-slate-700 sm:text-base"
        >
          {item.benefit}
        </p>
        <p
          data-problem-motivation
          className="absolute inset-0 flex items-center justify-center text-sm font-medium tracking-tight text-[#1a5f96] opacity-0 sm:text-lg"
        >
          “{item.motivation}”
        </p>
      </div>
      <span
        data-problem-rule
        className="mx-auto block h-px w-10 origin-center bg-slate-300 md:w-16"
      />
    </div>
  )
}

