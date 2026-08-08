"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Search, User, Check } from "lucide-react"
import { searchPanelists, Panelist } from "@/lib/api/PanelistAPI"
import { cn } from "@/lib/utils"
import { checkIsSpecialCreator } from "@/lib/config/specialCreators"
import { runPreviewPhasePreload } from "@/lib/utils/participatePreload"

const MIN_AGE = 18
const MAX_AGE = 120

export default function PreviewPersonalInformation() {
  const router = useRouter()
  const ageOptions = useMemo(
    () => Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i),
    []
  )
  const [age, setAge] = useState<number | undefined>(undefined)
  const [gender, setGender] = useState<string | null>("male")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ageError, setAgeError] = useState<string>("")
  const [formError, setFormError] = useState<string>("")
  const [isAdmin, setIsAdmin] = useState(false)

  // Only show panelist selection if the STUDY CREATOR is in specialCreators (email or domain).
  // For "Preview as Participant" from create-study (no studyIdParam), creator email comes from
  // study API or current_study_details. Fallback to logged-in user - they are the creator.
  useEffect(() => {
    try {
      let creatorEmail = localStorage.getItem('current_study_creator_email') || ''
      if (!creatorEmail) {
        try {
          const detailsRaw = localStorage.getItem('current_study_details')
          const study = detailsRaw ? JSON.parse(detailsRaw) : {}
          creatorEmail = study?.study_info?.creator_email || study?.creator_email || ''
        } catch { }
      }
      if (!creatorEmail) {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}')
          creatorEmail = user?.email || ''
        } catch { }
      }
      setIsAdmin(checkIsSpecialCreator(creatorEmail))
    } catch { }
  }, [])

  useEffect(() => {
    runPreviewPhasePreload('personal-info')
  }, [])

  const handleContinue = async () => {
    if (age == null || !gender || !gender.trim()) {
      setFormError("All fields are required.")
      return
    } else {
      setFormError("")
    }

    // Age validation: must be 18–120
    if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) {
      setAgeError(`Please select an age between ${MIN_AGE} and ${MAX_AGE}.`)
      return
    } else {
      setAgeError("")
    }

    setIsSubmitting(true)

    // Special creator: show fragrance question page before classification
    const nextPath = isAdmin
      ? '/home/create-study/preview/fragrance-like'
      : '/home/create-study/preview/classification-questions'
    setTimeout(() => {
      router.push(nextPath)
    }, 500)
  }

  if (isAdmin) {
    return (
      <PanelistSelection
        onComplete={() => router.push('/home/create-study/preview/fragrance-like')}
        creatorEmail={(() => {
          try {
            const stored = localStorage.getItem('current_study_creator_email')
            if (stored) return stored
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            return user?.email || ""
          } catch { return "" }
        })()}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white">

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900">Personal Information</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please provide some basic information about yourself. This helps us understand our study participants better.
        </p>

        <div className="mt-8 bg-white border rounded-xl shadow-sm p-4 sm:p-6">
          <div className="mt-2">
            <label htmlFor="preview-participant-age" className="block text-sm font-semibold text-gray-800 mb-2">Age</label>
            <div className="relative">
              <select
                id="preview-participant-age"
                value={age != null ? String(age) : ""}
                onChange={(e) => {
                  const value = e.target.value
                  if (!value) {
                    setAge(undefined)
                    return
                  }
                  const next = Number(value)
                  setAge(Number.isFinite(next) ? next : undefined)
                  setAgeError("")
                  setFormError("")
                }}
                className="w-full cursor-pointer h-11 appearance-none rounded-md border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-900 outline-none transition-colors hover:border-gray-300 focus:border-[rgba(38,116,186,0.3)] focus:ring-2 focus:ring-[rgba(38,116,186,0.3)]"
              >
                <option value="" disabled>
                  Select age
                </option>
                {ageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Please select your age. You must be at least {MIN_AGE} years old to participate.
            </p>
            {ageError && (
              <div className="mt-2 text-xs text-red-600">{ageError}</div>
            )}
            {formError && (
              <div className="mt-2 text-xs text-red-600">{formError}</div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-gray-800 mb-2">Gender</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle value="male" selected={gender} onSelect={setGender} label="Male" />
              <Toggle value="female" selected={gender} onSelect={setGender} label="Female" />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-md bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PanelistSelection({
  onComplete,
  creatorEmail
}: {
  onComplete: () => void;
  creatorEmail: string;
}) {
  const [panelists, setPanelists] = useState<Panelist[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPanelist, setSelectedPanelist] = useState<Panelist | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const primaryBlue = "rgba(38,116,186,1)"

  const handleSearchSubmit = async () => {
    const query = searchQuery.trim()
    if (!query) {
      setPanelists([])
      setSubmittedSearchQuery("")
      return
    }

    setSubmittedSearchQuery(query)
    setIsSearching(true)
    try {
      const data = await searchPanelists(creatorEmail, query)
      // Filter to only show exact matches (case-insensitive)
      const exactMatches = data.filter(
        (panelist) => panelist.id.toLowerCase() === query.toLowerCase()
      )
      setPanelists(exactMatches)
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
    // Clear results when user modifies input
    setPanelists([])
    setSubmittedSearchQuery("")
    setSelectedPanelist(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearchSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900">Select Panelist (Preview)</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose a panelist profile to continue with the study preview.
        </p>

        <div className="mt-8 bg-white border rounded-xl shadow-sm p-4 sm:p-6 space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-600" />
              <input
                type="text"
                placeholder="Enter Panelist ID..."
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearchSubmit}
              disabled={isSearching}
              className="shrink-0 h-10 px-5 rounded-full text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: primaryBlue }}
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Panelist List */}
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-gray-400 text-xs">Fetching panelists...</p>
              </div>
            ) : panelists.length > 0 ? (
              panelists.map((panelist) => (
                <div
                  key={panelist.id}
                  onClick={() => setSelectedPanelist(panelist)}
                  className={cn(
                    "group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4",
                    selectedPanelist?.id === panelist.id
                      ? "bg-blue-50/50 border-blue-600 ring-1 ring-blue-600"
                      : "bg-white border-gray-100 hover:border-blue-300 hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                    selectedPanelist?.id === panelist.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                  )} style={selectedPanelist?.id === panelist.id ? { backgroundColor: primaryBlue } : {}}>
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 truncate text-sm">#{panelist.id}</h3>
                    </div>
                  </div>
                  {selectedPanelist?.id === panelist.id && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryBlue }}>
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Search className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {submittedSearchQuery ? "No panelists found" : "Search for a panelist"}
                </h3>
                <p className="text-xs text-gray-400">
                  {submittedSearchQuery ? "Try a different panelist ID." : "Enter panelist ID and press Enter or click Search."}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[11px] text-gray-400 font-medium">
              {selectedPanelist ? (
                <span className="text-blue-600 font-bold">Selected ID: {selectedPanelist.id}</span>
              ) : (
                "Select a profile to continue"
              )}
            </p>
            <Button
              onClick={() => {
                setIsSubmitting(true)
                setTimeout(() => {
                  onComplete()
                }, 500)
              }}
              disabled={!selectedPanelist || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-10 h-11 text-sm font-bold transition-all disabled:bg-gray-200 disabled:text-gray-400 shadow-lg shadow-blue-500/10 flex items-center justify-center shrink-0"
              style={selectedPanelist ? { backgroundColor: primaryBlue } : {}}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Continuing...
                </>
              ) : "Continue Study Preview"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  value,
  selected,
  onSelect,
  label,
}: { value: string; selected: string | null; onSelect: (v: string) => void; label: string }) {
  const active = selected === value
  return (
    <button
      onClick={() => onSelect(value)}
      className={`w-full h-11 rounded-md border text-sm transition-colors ${active ? "bg-[rgba(38,116,186,1)] text-white border-[rgba(38,116,186,1)]" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"}`}
    >
      {label}
    </button>
  )
}
