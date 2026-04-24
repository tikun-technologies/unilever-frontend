"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff } from "lucide-react"
import { login as loginApi, forgotPassword } from "@/lib/api/LoginApi"
import { useAuth } from "@/lib/auth/AuthContext"
import { signIn } from "next-auth/react"

interface LoginFormProps {
  onSwitchToRegister: () => void
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const clearPublicCaches = () => {
    try {
      localStorage.removeItem('home_stats_cache')
      localStorage.removeItem('home_studies_cache')
      localStorage.removeItem('home_projects_cache')

      // Clear all create-study related localStorage items
      const keysToRemove = [
        'cs_step1', 'cs_step2', 'cs_step3', 'cs_step4', 'cs_step5_grid',
        'cs_step5_layer', 'cs_step5_layer_background', 'cs_step5_layer_preview_aspect',
        'cs_step6', 'cs_step7_tasks', 'cs_step7_matrix', 'cs_step7_job_state',
        'cs_step7_timer_state', 'cs_current_step', 'cs_backup_steps',
        'cs_flash_message', 'cs_resuming_draft', 'cs_study_id', 'cs_is_fresh_start', 'cs_step8'
      ]
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // Clear all project specific study caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('ps_cache_')) {
          localStorage.removeItem(key)
        }
      })

      sessionStorage.removeItem('cs_previous_study_id')
      sessionStorage.removeItem('last_selected_project')
    } catch { }
  }

  const handleGoogleSignIn = async () => {
    try {
      clearPublicCaches()
      setIsGoogleLoading(true)
      setErrorMessage("")
      // Use NextAuth.js with callbackUrl to redirect to a custom handler page
      await signIn("google", {
        callbackUrl: "/auth/callback"
      })

    } catch (error) {
      setErrorMessage("Google sign-in failed. Please try again.")
      setIsGoogleLoading(false)
    }
  }

  const handleMicrosoftSignIn = async () => {
    try {
      clearPublicCaches()
      setIsMicrosoftLoading(true)
      setErrorMessage("")
      // Use NextAuth.js with callbackUrl to redirect to a custom handler page
      await signIn("microsoft-entra-id", {
        callbackUrl: "/auth/callback"
      })

    } catch (error) {
      setErrorMessage("Microsoft sign-in failed. Please try again.")
      setIsMicrosoftLoading(false)
    }
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const emailOrUsername = formData.get('emailOrUsername') as string

    if (!emailOrUsername.trim()) {
      alert("Please enter your email.")
      return
    }

    setIsSendingReset(true)
    try {
      // console.log("Calling forgot password API with:", emailOrUsername.trim())
      // Call the real forgot password API
      const response = await forgotPassword({
        email: emailOrUsername.trim()
      })
      // console.log("API Response:", response)
      alert("Password reset link has been sent to your email address")
      setShowForgotPasswordDialog(false)
    } catch (err: any) {
      console.error("Forgot password API error:", err)
      let message = "Failed to send reset email. Please try again."

      if (err?.data?.detail) {
        if (typeof err.data.detail === 'string') {
          message = err.data.detail
        } else if (Array.isArray(err.data.detail)) {
          message = err.data.detail.map((error: any) => {
            if (typeof error === 'string') return error
            if (typeof error === 'object') return error.msg || error.message || JSON.stringify(error)
            return String(error)
          }).join(', ')
        } else if (typeof err.data.detail === 'object') {
          message = err.data.detail.message || err.data.detail.msg || 'Validation error occurred'
        }
      } else if (err?.message) {
        message = err.message
      }

      alert(message)
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
          Secure Login
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome to <span className="text-blue-600">Mindsurf</span>
        </h2>
        <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
      </div>

      <form
        className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            setErrorMessage("")
            setSuccessMessage("")
            clearPublicCaches()
            if (!identifier || !password) {
              setErrorMessage("Please enter email and password.")
              return
            }
            setIsSubmitting(true)
            try {
              const response = await loginApi({
                email: identifier,
                password,
              })

              // Store user data and tokens in auth context
              login(response.user, response.tokens)

              setSuccessMessage("Logged in successfully.")

              // Redirect to home page after successful login
              setTimeout(() => {
                router.push('/home')
              }, 1000)

            } catch (err: unknown) {
              let message = "Login failed."

              if ((err as any)?.data?.detail) {
                // Handle different error formats
                if (typeof (err as any).data.detail === 'string') {
                  message = (err as any).data.detail
                } else if (Array.isArray((err as any).data.detail)) {
                  // Handle validation errors array
                  message = (err as any).data.detail.map((error: Record<string, unknown>) => {
                    if (typeof error === 'string') return error
                    if (typeof error === 'object') return error.msg || error.message || JSON.stringify(error)
                    return String(error)
                  }).join(', ')
                } else if (typeof (err as any).data.detail === 'object') {
                  // Handle object errors
                  message = (err as any).data.detail.message || (err as any).data.detail.msg || 'Validation error occurred'
                }
              } else if ((err as Error)?.message) {
                message = (err as Error).message
              }

              setErrorMessage(message)
            } finally {
              setIsSubmitting(false)
            }
          }}
        >
        {errorMessage && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            {typeof errorMessage === 'string' ? errorMessage : 'An error occurred'}
          </div>
        )}
        {successMessage && (
          <div className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
            {successMessage}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="w-full h-11 px-4 pr-11 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              className="cursor-pointer"
            />
            <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">
              Remember me
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShowForgotPasswordDialog(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        <Button
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-gray-400 uppercase tracking-wide">or</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isMicrosoftLoading}
            className="flex items-center justify-center gap-2 h-11 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleMicrosoftSignIn}
            disabled={isGoogleLoading || isMicrosoftLoading}
            className="flex items-center justify-center gap-2 h-11 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMicrosoftLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 23 23">
                  <path fill="#f25022" d="M1 1h10v10H1z"/>
                  <path fill="#00a4ef" d="M12 1h10v10H12z"/>
                  <path fill="#7fba00" d="M1 12h10v10H1z"/>
                  <path fill="#ffb900" d="M12 12h10v10H12z"/>
                </svg>
                Microsoft
              </>
            )}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 pt-1">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
          >
            Sign up
          </button>
        </p>
      </form>

      {/* Enhanced Forgot Password Dialog with Blur Background */}
      {showForgotPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100 animate-slideIn">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Forgot Password</h2>
                <button
                  onClick={() => setShowForgotPasswordDialog(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    name="emailOrUsername"
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 rounded-full border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPasswordDialog(false)}
                    className="flex-1 py-3 rounded-full border-gray-300 hover:bg-gray-50 transition-colors"
                    disabled={isSendingReset}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full font-medium transition-colors"
                    disabled={isSendingReset}
                  >
                    {isSendingReset ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}