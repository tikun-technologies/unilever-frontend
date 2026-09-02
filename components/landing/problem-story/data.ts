export const BENEFIT_MEANINGS = [
  { id: "hydrates", benefit: "HYDRATES", motivation: "Feels caring" },
  { id: "protects", benefit: "PROTECTS", motivation: "Feels safe" },
  { id: "revives", benefit: "REVIVES", motivation: "Feels energizing" },
  { id: "nourishes", benefit: "NOURISHES", motivation: "Feels restorative" },
] as const

export const PERCEPTIONS = [
  { id: "premium", signal: "PREMIUM", meaning: "Value", decision: "I’d pay more." },
  { id: "trusted", signal: "TRUSTED", meaning: "Confidence", decision: "I’d choose it first." },
  { id: "simple", signal: "SIMPLE", meaning: "Ease", decision: "I’d pick it quickly." },
] as const

export const PRODUCT_LAYERS = [
  { type: "bottle", name: "mink" },
  { type: "element", name: "flame" },
  { type: "product", name: "shampoo" },
  { type: "proposition", name: "revives" },
  { type: "pump", name: "A-light" },
] as const

