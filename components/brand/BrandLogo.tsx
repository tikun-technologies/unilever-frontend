import { getBrand } from "@/lib/config/brand"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  const brand = getBrand()

  return (
    <span className={cn("font-bold", className)}>
      <span className="text-[rgba(38,116,186,1)]">{brand.prefix}</span>
      <span className="text-gray-800">{brand.suffix}</span>
    </span>
  )
}
