"use client"

import { useEffect, useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"
import { Mail, X } from "lucide-react"
import { getBrand } from "@/lib/config/brand"

const BRAND_BLUE = "#1a5f96"
const BRAND_BLUE_HOVER = "#155a8a"

type LandingContactProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function LandingContact({ open, onOpenChange }: LandingContactProps) {
  const brand = getBrand()
  const titleId = useId()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.location.hash === "#contact") {
      onOpenChange(true)
    }
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setError(data?.error || "Could not send your inquiry. Please try again.")
        return
      }
      setSent(true)
      setForm(EMPTY_FORM)
    } catch {
      setError("Could not send your inquiry. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setSent(false)
      setError("")
    }, 200)
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed bottom-5 right-5 z-[60] inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:bottom-6 sm:right-6"
          style={{ backgroundColor: BRAND_BLUE }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = BRAND_BLUE_HOVER
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BRAND_BLUE
          }}
        >
          <Mail className="h-4 w-4" />
          Contact Us
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-slate-900/40"
            aria-label="Close contact form"
            onClick={handleClose}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id={titleId} className="text-lg font-bold tracking-tight text-slate-900">
                  Contact Us
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tell us about your study. We&apos;ll get back to you at the email you provide.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Close contact form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {sent ? (
              <div className="px-5 py-8 text-center sm:px-6">
                <p className="text-base font-semibold text-slate-900">Inquiry sent</p>
                <p className="mt-2 text-sm text-slate-500">
                  Thanks for reaching out to {brand.displayName}. Our team will reply shortly.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: BRAND_BLUE }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-6">
                <div className="hidden" aria-hidden>
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={update("website")}
                  />
                </div>

                <Field label="Name" htmlFor="contact-name" required>
                  <input
                    id="contact-name"
                    name="name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={update("name")}
                    className={fieldClass}
                    placeholder="Jane Smith"
                  />
                </Field>

                <Field label="Company" htmlFor="contact-company">
                  <input
                    id="contact-company"
                    name="company"
                    autoComplete="organization"
                    value={form.company}
                    onChange={update("company")}
                    className={fieldClass}
                    placeholder="Your company"
                  />
                </Field>

                <Field label="Email" htmlFor="contact-email" required>
                  <input
                    id="contact-email"
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

                <Field label="Message / study inquiry" htmlFor="contact-message" required>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    minLength={10}
                    rows={4}
                    value={form.message}
                    onChange={update("message")}
                    className={`${fieldClass} min-h-[112px] resize-y py-2.5`}
                    placeholder="What would you like to test or learn?"
                  />
                </Field>

                {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: BRAND_BLUE }}
                >
                  {isSubmitting ? "Sending..." : "Send inquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
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
