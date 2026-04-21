"use client";

import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { IMAGE_CONFIG } from "../explore/pilot/image-config";

const PILOT_PASSWORD = "UFH2026";
const SESSION_KEY = "ff4_access_granted";

const OPTIMIZER_SRC = "/ff4/optimizer.html";

export default function Ff4Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gateError, setGateError] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(SESSION_KEY) === "true") {
        setIsAuthenticated(true);
      }
    }
    setIsCheckingSession(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;
    for (const row of IMAGE_CONFIG) {
      const src = `/api/proxy-image?url=${encodeURIComponent(row.url)}`;
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    }
  }, [isAuthenticated]);

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gatePassword === PILOT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setIsAuthenticated(true);
      setGateError("");
    } else {
      setGateError("Please contact your admin");
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
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
              Please enter the password to access FF⁴ Fragrance Mixture Optimizer
            </p>
          </div>

          <form onSubmit={handleGateSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={gatePassword}
                onChange={(e) => {
                  setGatePassword(e.target.value);
                  setGateError("");
                }}
                placeholder="Enter password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgba(38,116,186,0.5)] focus:border-[rgba(38,116,186,1)] outline-none transition-colors text-center text-lg"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {gateError && (
              <p className="text-red-500 text-sm text-center">{gateError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white font-medium rounded-lg transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f8f6f3]">
      <iframe
        title="FF⁴ Fragrance Mixture Optimizer"
        src={OPTIMIZER_SRC}
        className="w-full flex-1 border-0 min-h-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
