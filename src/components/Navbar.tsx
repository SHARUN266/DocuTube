"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FolderKanban, Play, LogIn, Key } from "lucide-react";
import { UserButton, SignInButton, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import ApiKeyModal from "@/components/ApiKeyModal";

export default function Navbar() {
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const { isSignedIn } = useAuth();

  React.useEffect(() => {
    if (isSignedIn) {
      const savedKey = localStorage.getItem("docutube_gemini_api_key");
      if (!savedKey) {
        setIsKeyModalOpen(true);
      }
    }
  }, [isSignedIn]);

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-transform duration-150 active:scale-95">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white shadow-md shadow-red-500/20">
            <Play className="h-4.5 w-4.5 fill-current translate-x-[1px]" />
          </div>
          <span className="font-sans text-xl font-bold tracking-tight text-foreground">
            DocuTube<span className="text-red-600">AI</span>
          </span>
        </Link>

        {/* Action Buttons / Auth */}
        <div className="flex items-center gap-4">
          <SignedIn>
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent hover:border-red-500/30 hover:shadow-sm active:scale-95"
            >
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">API Key</span>
            </button>
            <Link href="/dashboard">
              <button
                className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent hover:border-red-500/30 hover:shadow-sm active:scale-95"
              >
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            </Link>
            <div className="flex h-9.5 w-9.5 items-center justify-center rounded-full border border-border bg-muted overflow-hidden">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 active:scale-95 transition-all">
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            </SignInButton>
          </SignedOut>
        </div>
        </div>
      </nav>
      
      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
    </>
  );
}
