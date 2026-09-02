import Image from "next/image"
import { getBrand } from "@/lib/config/brand"
import { PRODUCT_LAYERS } from "./data"

function ProductStack({ className = "" }: { className?: string }) {
  const brand = getBrand()

  return (
    <div className={`relative aspect-square ${className}`}>
      {PRODUCT_LAYERS.map(({ type, name }) => (
        <Image
          key={type}
          src={`/landing-page/story/${type}/${name}.webp`}
          alt={type === "bottle" ? `${brand.displayName} product concept` : ""}
          fill
          sizes="(max-width: 768px) 48vw, 280px"
          className="object-contain"
          priority={type === "bottle"}
        />
      ))}
    </div>
  )
}

export function ProductMoment() {
  return (
    <>
      <div
        data-problem-opening
        className="pointer-events-none absolute inset-x-0 top-[10%] z-40 text-center md:top-[9%]"
      >
        <h2
          className="text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
          style={{ letterSpacing: "-0.055em" }}
        >
          ONE PRODUCT.
        </h2>
        <p className="mt-4 text-sm text-slate-500 sm:text-base">
          One product. One shelf. One choice.
        </p>
      </div>

      <div
        data-problem-product-stage
        className="pointer-events-none absolute left-1/2 top-[46%] z-50 -translate-x-1/2 -translate-y-1/2 md:top-[55%]"
      >
        <div
          data-problem-focus
          className="absolute left-1/2 top-1/2 hidden h-[clamp(15rem,34vh,24rem)] w-[clamp(15rem,34vh,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/70 md:block"
        />
        <div
          data-problem-focus
          className="absolute left-1/2 top-1/2 hidden h-[clamp(11rem,25vh,18rem)] w-[clamp(11rem,25vh,18rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-100 md:block"
        />
        <span
          data-problem-product-guide
          className="absolute left-1/2 top-1/2 hidden h-px w-[clamp(18rem,50vw,42rem)] -translate-x-1/2 bg-slate-100 md:block"
        />
        <span
          data-problem-product-guide
          className="absolute left-1/2 top-1/2 hidden h-[clamp(18rem,58vh,32rem)] w-px -translate-y-1/2 bg-slate-100 md:block"
        />
        <div
          data-problem-product
          className="relative h-[clamp(12rem,30vh,20rem)] w-[clamp(12rem,30vh,20rem)]"
        >
          <ProductStack className="h-full w-full" />
        </div>
        <div
          data-problem-object-note
          className="absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 opacity-0"
        >
          <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            The object stays the same
          </span>
        </div>
      </div>
    </>
  )
}

