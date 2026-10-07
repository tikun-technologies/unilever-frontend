import { QUOTA_CLOSED_MESSAGE } from "@/lib/participate/quotaClosed"

export function QuotaClosedScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm sm:px-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">You can&apos;t continue this study</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{QUOTA_CLOSED_MESSAGE}</p>
      </div>
    </div>
  )
}
