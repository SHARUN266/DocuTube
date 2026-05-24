"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Key, Shield, Eye, EyeOff, ExternalLink, AlertTriangle, 
  CheckCircle, Loader2, X, RefreshCw, Trash2
} from "lucide-react";
import { encryptApiKey } from "@/utils/crypto";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: (apiKey: string | null) => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const { user, isLoaded } = useUser();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem("docutube_gemini_api_key");
      setIsKeySaved(!!savedKey);
      setApiKey("");
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  const validateKey = (key: string): boolean => {
    if (!key.trim()) {
      setError("API Key cannot be empty.");
      return false;
    }
    if (!key.startsWith("AIzaSy")) {
      setError("Invalid Gemini API Key format. It should start with 'AIzaSy'.");
      return false;
    }
    if (key.length < 35) {
      setError("API Key seems too short. Please double-check.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !user) {
      setError("User authentication is loading. Please try again in a moment.");
      return;
    }

    if (!validateKey(apiKey)) return;

    setIsSaving(true);
    try {
      // Encrypt the key locally using the user's Clerk ID as the password
      const encryptedBase64 = await encryptApiKey(apiKey.trim(), user.id);
      
      // Save strictly to local storage
      localStorage.setItem("docutube_gemini_api_key", encryptedBase64);
      window.dispatchEvent(new Event("apiKeyUpdated"));
      
      setSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose(apiKey.trim());
      }, 1000);
    } catch (err: any) {
      console.error("Encryption error:", err);
      setError(`Failed to securely save API key: ${err.message || String(err)}`);
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete your API key? You won't be able to generate or chat until you provide a new one.")) {
      localStorage.removeItem("docutube_gemini_api_key");
      window.dispatchEvent(new Event("apiKeyUpdated"));
      setIsKeySaved(false);
      setApiKey("");
      setError(null);
      alert("API key removed successfully.");
      onClose(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        {/* Overlay Background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={() => isKeySaved && onClose(null)} // Only allow clicking backdrop to close if a key is already saved
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-white p-8 shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-inner">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground tracking-tight">
                  Gemini API Key Configuration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Secure local credential setup
                </p>
              </div>
            </div>
            {isKeySaved && (
              <button
                onClick={() => onClose(null)}
                className="rounded-xl border border-border p-1.5 text-muted-foreground hover:bg-muted transition active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Privacy Guarantee Banner */}
          <div className="mb-6 rounded-2xl bg-red-50/50 border border-red-100 p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                PRIVACY GUARANTEE
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We do not store, save, track, or access your API key in any way. Your API key remains encrypted and stored only on your local system.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="apiKeyInput" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Gemini API Key
                </label>
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition"
                >
                  Get key from Google AI Studio <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  id="apiKeyInput"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={isKeySaved ? "••••••••••••••••••••••••••••••••••••••••" : "AIzaSy..."}
                  className="w-full rounded-2xl border border-border bg-white pl-4 pr-11 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all font-mono"
                  required={!isKeySaved}
                  disabled={isSaving || success}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition active:scale-90"
                >
                  {showKey ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              {!isKeySaved && (
                <div className="mt-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground border border-border/50">
                  <p className="font-bold mb-1 text-foreground">How to get your key:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-1">
                    <li>Click the link above to open Google AI Studio.</li>
                    <li>Sign in with your Google account.</li>
                    <li>Click <strong>"Get API key"</strong> in the left sidebar.</li>
                    <li>Click <strong>"Create API key"</strong> and copy it here.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Error or Success alerts */}
            {error && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2 animate-shake">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs text-green-800 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Securely saved! Workspace is ready.</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {isKeySaved && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-2xl text-xs active:scale-95 transition"
                  disabled={isSaving || success}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Key
                </button>
              )}

              <button
                type="submit"
                className={`flex-1 py-3.5 px-5 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                  success
                    ? "bg-green-600 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white active:scale-98"
                }`}
                disabled={isSaving || success || (!apiKey && isKeySaved)}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Encrypting...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="h-4.5 w-4.5" />
                    Saved Successfully
                  </>
                ) : isKeySaved ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Update API Key
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Save Encrypted Key
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
