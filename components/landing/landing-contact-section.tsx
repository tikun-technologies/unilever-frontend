"use client"

import { useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"
import { CalendarDays, Check, Mail, Send } from "lucide-react"
import { getBrand } from "@/lib/config/brand"

const BRAND_BLUE = "#1a5f96"
const BRAND_BLUE_RGB = "26, 89, 150"

type LandingContactSectionProps = {
  calendarUrl?: string
}

type FormState = {
  name: string
  company: string
  email: string
  message: string
  website: string
}

const EMPTY_FORM: FormState = {
  name: "",
  company: "",
  email: "",
  message: "",
  website: "",
}

export function LandingContactSection({ calendarUrl }: LandingContactSectionProps) {
  const brand = getBrand()
  const titleId = useId()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const update =
    (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
      const endpoint = apiBase ? `${apiBase}/contact` : "/api/contact"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(
          apiBase
            ? {
                name: form.name,
                company: form.company || null,
                email: form.email,
                message: form.message,
                website: form.website || null,
                source: "landing",
              }
            : form
        ),
      })
      if (res.ok) {
        setSent(true)
        setForm(EMPTY_FORM)
        return
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string
        detail?: string | { msg?: string }[]
      } | null
      const detail = data?.detail
      const detailMsg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail) && typeof detail[0]?.msg === "string"
            ? detail[0].msg
            : undefined
      setError(data?.error || detailMsg || "Could not send your inquiry. Please try again.")
    } catch {
      setError("Could not send your inquiry. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="relative scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="flex flex-col justify-center">
          <span className="mb-3 inline-flex w-fit items-center rounded-full bg-[#1a5f96]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a5f96]">
            Have a decision to make?
          </span>
          <h2
            id={titleId}
            className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            Have a decision
            <br />
            you&apos;re stuck on?
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500 sm:text-lg">
            Bring us the question.
            <br />
            We&apos;ll help you design the experiment.
          </p>

          {calendarUrl ? (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1a5f96] px-8 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-[#155a8a] hover:shadow-xl sm:w-fit"
              style={{ boxShadow: `0 12px 28px rgba(${BRAND_BLUE_RGB}, 0.35)` }}
            >
              <CalendarDays className="h-5 w-5" strokeWidth={2} />
              Schedule a call
            </a>
          ) : null}

          <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#1a5f96]">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-slate-700">Every decision starts with a question.</p>
              <p>Fill in the form and our team replies within one business day.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)] sm:p-8">
          {sent ? (
            <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1a5f96]/10 text-[#1a5f96]">
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <p className="text-lg font-semibold text-slate-900">Your enquiry has been sent</p>
              <p className="mt-2 max-w-xs text-sm text-slate-500">
                Thanks for reaching out to {brand.displayName}. Our team will reply shortly.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-6 text-sm font-bold text-white"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="hidden" aria-hidden>
                <label htmlFor="contact-section-website">Website</label>
                <input
                  id="contact-section-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={update("website")}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="contact-section-name" required>
                  <input
                    id="contact-section-name"
                    name="name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={update("name")}
                    className={fieldClass}
                    placeholder="Jane Smith"
                  />
                </Field>

                <Field label="Company" htmlFor="contact-section-company">
                  <input
                    id="contact-section-company"
                    name="company"
                    autoComplete="organization"
                    value={form.company}
                    onChange={update("company")}
                    className={fieldClass}
                    placeholder="Your company"
                  />
                </Field>
              </div>

              <Field label="Email" htmlFor="contact-section-email" required>
                <input
                  id="contact-section-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={update("email")}
                  className={fieldClass}
                  placeholder="you@company.com"
                />
              </Field>

              <Field label="Message / study inquiry" htmlFor="contact-section-message" required>
                <textarea
                  id="contact-section-message"
                  name="message"
                  required
                  minLength={10}
                  rows={5}
                  value={form.message}
                  onChange={update("message")}
                  className={`${fieldClass} min-h-[128px] resize-y py-2.5`}
                  placeholder="What would you like to test or learn?"
                />
              </Field>

              {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4" strokeWidth={2} />
                    Send inquiry
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1a5f96] focus:ring-2 focus:ring-[#1a5f96]/20"

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  )
}
