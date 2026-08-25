import { NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

const MAX_NAME = 120
const MAX_COMPANY = 120
const MAX_MESSAGE = 4000
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 5

const recentByIp = new Map<string, number[]>()

type ContactBody = {
  name?: unknown
  company?: unknown
  email?: unknown
  message?: unknown
  website?: unknown
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const stamps = (recentByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (stamps.length >= RATE_LIMIT) {
    recentByIp.set(ip, stamps)
    return true
  }
  stamps.push(now)
  recentByIp.set(ip, stamps)
  return false
}

function backendErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "Could not send your inquiry. Please try again."
  }
  const detail = (data as { detail?: unknown; error?: unknown }).detail
  const error = (data as { error?: unknown }).error
  if (typeof error === "string" && error.trim()) return error
  if (typeof detail === "string" && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown }
    if (typeof first?.msg === "string") return first.msg
  }
  return "Could not send your inquiry. Please try again."
}

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "Too many inquiries. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: "Could not send your inquiry. Please try again." },
      { status: 502 }
    )
  }

  let body: ContactBody
  try {
    body = (await req.json()) as ContactBody
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  // Honeypot — bots fill this; pretend success without hitting the API
  if (asTrimmedString(body.website)) {
    return NextResponse.json({ ok: true })
  }

  const name = asTrimmedString(body.name)
  const company = asTrimmedString(body.company)
  const email = asTrimmedString(body.email)
  const message = asTrimmedString(body.message)

  if (name.length < 2 || name.length > MAX_NAME) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 })
  }
  if (company.length > MAX_COMPANY) {
    return NextResponse.json({ error: "Company name is too long." }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 })
  }
  if (message.length < 10 || message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: "Please enter a message (at least 10 characters)." },
      { status: 400 }
    )
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)
    const res = await fetch(`${API_BASE_URL}/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Forwarded-For": clientIp(req),
      },
      body: JSON.stringify({
        name,
        company: company || null,
        email,
        message,
        source: "landing",
      }),
      signal: controller.signal,
      cache: "no-store",
    }).finally(() => clearTimeout(timeout))

    if (res.ok) {
      return NextResponse.json({ ok: true })
    }

    const data = await res.json().catch(() => null)
    return NextResponse.json(
      { error: backendErrorMessage(data) },
      { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
    )
  } catch {
    return NextResponse.json(
      { error: "Could not send your inquiry. Please try again." },
      { status: 502 }
    )
  }
}
