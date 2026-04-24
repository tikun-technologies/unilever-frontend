
"use client"

import { useState } from "react"
import Image from "next/image"
import { LoginForm } from "./components/login"
import { RegisterForm } from "./components/register-form"
import { AuthGuard } from "@/components/auth/AuthGuard"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-white flex flex-col md:flex-row">
        {/* Left side - Auth forms */}
        <div className="w-full md:w-[52%] flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
          <div className="w-full max-w-md">
            {isLogin ? (
              <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
            )}
          </div>
        </div>

        {/* Right side - branded panel */}
        <div className="hidden md:flex md:w-[48%] relative overflow-hidden bg-[#1a2744]">
          {/* SVG background pattern */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
              </pattern>
              <radialGradient id="glow1" cx="30%" cy="20%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id="glow2" cx="75%" cy="80%" r="50%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
            <rect width="100%" height="100%" fill="url(#glow1)"/>
            <rect width="100%" height="100%" fill="url(#glow2)"/>
            {/* Decorative circles */}
            <circle cx="85%" cy="12%" r="80" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="1.5"/>
            <circle cx="85%" cy="12%" r="50" fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth="1"/>
            <circle cx="15%" cy="88%" r="100" fill="none" stroke="rgba(59,130,246,0.12)" strokeWidth="1.5"/>
            <circle cx="15%" cy="88%" r="60" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="1"/>
            {/* Floating dots */}
            <circle cx="20%" cy="25%" r="3" fill="rgba(148,163,184,0.3)"/>
            <circle cx="78%" cy="40%" r="2" fill="rgba(148,163,184,0.25)"/>
            <circle cx="55%" cy="15%" r="2.5" fill="rgba(148,163,184,0.2)"/>
            <circle cx="90%" cy="65%" r="3" fill="rgba(148,163,184,0.2)"/>
            <circle cx="10%" cy="55%" r="2" fill="rgba(148,163,184,0.25)"/>
          </svg>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center p-10 lg:p-14 w-full">
            {/* GIF in a clean card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-8 shadow-2xl">
              <div className="relative w-44 h-44 lg:w-52 lg:h-52 mx-auto rounded-xl overflow-hidden bg-white/5">
                <Image
                  src="/giphy.gif"
                  alt="Animated illustration"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Text content */}
            <div className="text-center max-w-sm">
              <h2 className="text-2xl lg:text-3xl font-bold text-white leading-snug mb-4">
                Stop Guessing.<br />
                <span className="text-blue-300">Know Exactly What Drives</span><br />
                Your Customers Decisions.
              </h2>
              <p className="text-slate-400 text-sm lg:text-base leading-relaxed">
                Traditional surveys tell you what people think they want. Mind Genomics Experiments uncover the response patterns and mindsets that actually trigger them to buy, engage, and act.
              </p>

              {/* Trust indicators */}

            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
