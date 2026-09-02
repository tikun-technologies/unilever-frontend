import { getBrand } from "@/lib/config/brand"

const brand = getBrand()

export const WORKFLOW_STAGES = [
  {
    number: "01",
    id: "ask",
    title: "ASK",
    description: "Define the business question.",
  },
  {
    number: "02",
    id: "test",
    title: "TEST",
    description: "Put propositions / concepts in front of people.",
  },
  {
    number: "03",
    id: "decode",
    title: "DECODE",
    description: `${brand.displayName} identifies the underlying drivers.`,
  },
  {
    number: "04",
    id: "decide",
    title: "DECIDE",
    description: "Know which proposition to scale.",
  },
] as const

export const RESEARCH_QUESTION =
  "Why are customers choosing one proposition over another?"

export const PROPOSITIONS = [
  { id: "premium", letter: "A", label: "PREMIUM" },
  { id: "simple", letter: "B", label: "SIMPLE" },
  { id: "trusted", letter: "C", label: "TRUSTED", winner: true },
] as const

export const RESPONSE_SIGNALS = [
  { id: "r1", proposition: "premium", text: "worth more", x: 10, y: 61 },
  { id: "r2", proposition: "premium", text: "polished", x: 24, y: 73 },
  { id: "r3", proposition: "simple", text: "easy choice", x: 41, y: 65 },
  { id: "r4", proposition: "simple", text: "less effort", x: 57, y: 76 },
  { id: "r5", proposition: "trusted", text: "credible", x: 73, y: 64 },
  { id: "r6", proposition: "trusted", text: "choose first", x: 89, y: 73 },
] as const

export const DECODE_POSITIONS = [
  { x: -76, y: -34 },
  { x: -48, y: 26 },
  { x: -12, y: -17 },
  { x: 18, y: 31 },
  { x: 52, y: -27 },
  { x: 78, y: 19 },
] as const

