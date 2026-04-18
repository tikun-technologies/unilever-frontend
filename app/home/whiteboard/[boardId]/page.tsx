"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Lock } from "lucide-react"

const BOARD_PASSWORD = "UFH2026"
const SESSION_KEY = "whiteboard_access_granted"

export default function WhiteboardPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const boardId = params.boardId as string
  const projId = searchParams.get("proj_id")

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const accessGranted = sessionStorage.getItem(SESSION_KEY)
    if (accessGranted === "true") {
      setIsAuthenticated(true)
    }
    setIsChecking(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === BOARD_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true")
      setIsAuthenticated(true)
      setError("")
    } else {
      setError("Please contact your admin")
    }
  }

  const handleBack = () => {
    if (projId) {
      router.push(`/home?proj_id=${projId}`)
    } else {
      router.push("/home")
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-[rgba(38,116,186,0.1)] rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-[rgba(38,116,186,1)]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Welcome</h2>
            <p className="text-gray-600 text-center mt-2">
              Please enter the password to access board
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgba(38,116,186,0.5)] focus:border-[rgba(38,116,186,1)] outline-none transition-colors text-center text-lg"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white font-medium rounded-lg transition-colors"
            >
              Access Board
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b bg-white z-10">

        <h1 className="text-lg font-semibold text-gray-800">Whiteboard</h1>
      </div>

      {/* Embedded tldraw board */}
      <div className="flex-1">
        <iframe
          src={`https://www.tldraw.com/r/${boardId}`}
          className="w-full h-full border-0"
          style={{ minHeight: "calc(100vh - 57px)" }}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
