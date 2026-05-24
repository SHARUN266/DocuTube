"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Play, ArrowRight, ShieldCheck, Zap, MessageSquare, 
  Sparkles, FileCode, CheckCircle2, LogIn
} from "lucide-react";
import { SignedIn, SignedOut, SignInButton, useClerk } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const clerk = useClerk();

  const handleStartGenerating = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      localStorage.setItem("docutube_pending_url", url.trim());
    }
    clerk.openSignIn({ forceRedirectUrl: "/workspace/new" });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  } as const;

  const featureCards = [
    {
      icon: FileCode,
      title: "7 Document Specifications",
      desc: "Instantly draft PRDs, TRDs, SRSs, API docs, test cases, database schemas, and setup guides.",
      badge: "Comprehensive",
    },
    {
      icon: MessageSquare,
      title: "Interactive AI Chat",
      desc: "Discuss technical architecture, ask questions, or verify specific setup details with the built-in AI chat.",
      badge: "Real-time",
    },
    {
      icon: Zap,
      title: "Optimized Processing",
      desc: "Driven by Gemini 2.5 Flash, generating complete documentation suites sequentially in less than a minute.",
      badge: "Lightning Fast",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-foreground">
      {/* Background decoration */}
      <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-full max-w-7xl -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,0,0,0.04),transparent_50%)]" />

      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center pt-20 pb-16 text-center lg:pt-32"
        >
          {/* Badge */}
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/10 bg-red-50/50 px-3.5 py-1 text-xs font-semibold text-red-600 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Introducing DocuTube AI v1.0</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemVariants}
            className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl max-w-3xl leading-[1.1]"
          >
            Turn YouTube Videos Into{" "}
            <span className="relative inline-block text-red-600">
              Technical Docs
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground"
          >
            Paste any development tutorial or architecture talk, and instantly compile PRDs,
            schemas, API reference manuals, and setup instructions.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col items-center justify-center gap-4 w-full"
          >
            <SignedIn>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/workspace/new">
                  <motion.button
                    whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(255,0,0,0.15)" }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center justify-center gap-2 rounded-full bg-red-600 px-8 py-4 text-base font-bold text-white shadow-lg transition-colors hover:bg-red-700 active:scale-95 w-full sm:w-auto"
                  >
                    Create New Workspace
                    <ArrowRight className="h-4.5 w-4.5" />
                  </motion.button>
                </Link>

                <Link href="/dashboard">
                  <button
                    className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-white px-8 py-4 text-base font-bold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95 w-full sm:w-auto"
                  >
                    View My Dashboard
                  </button>
                </Link>
              </div>
            </SignedIn>

            <SignedOut>
              <form 
                onSubmit={handleStartGenerating}
                className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg mx-auto"
              >
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Play className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste YouTube tutorial URL..."
                    className="block w-full rounded-full border border-border bg-white py-4 pl-12 pr-4 text-sm text-foreground shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    required
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(255,0,0,0.15)" }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-full bg-red-600 px-8 py-4 text-base font-bold text-white shadow-lg transition-colors hover:bg-red-700 active:scale-95 w-full sm:w-auto whitespace-nowrap"
                >
                  Start Generating
                  <ArrowRight className="h-4.5 w-4.5" />
                </motion.button>
              </form>
            </SignedOut>
          </motion.div>

          {/* Trust Indicators & Social Proof */}
          <motion.div
            variants={itemVariants}
            className="mt-16 flex flex-col items-center justify-center gap-6"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-green-600" />
                Secure Private Workspaces
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                Powered by Gemini
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4.5 w-4.5 text-green-600" />
                Zero Setup Needed
              </div>
            </div>
            
            <div className="mt-4 flex flex-col items-center gap-3">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">Trusted by developers at</p>
              <div className="flex items-center gap-6 sm:gap-10 opacity-40 grayscale">
                <div className="text-sm font-bold font-sans">NETFLIX</div>
                <div className="text-sm font-bold font-sans">Meta</div>
                <div className="text-sm font-bold font-sans">Vercel</div>
                <div className="text-sm font-bold font-sans hidden sm:block">Stripe</div>
                <div className="text-sm font-bold font-sans hidden sm:block">Google</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Feature Cards Grid */}
        <section className="border-t border-border py-20 lg:py-28">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {featureCards.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.4 }}
                  whileHover={{ y: -5 }}
                  className="group relative overflow-hidden rounded-3xl border border-border bg-white p-8 transition-all hover:shadow-2xl hover:shadow-red-500/10 hover:border-red-500/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 transition-colors group-hover:bg-red-600 group-hover:text-white shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-muted/80 px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="relative z-10 mt-6 text-xl font-bold text-foreground group-hover:text-red-600 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="relative z-10 mt-3 text-sm leading-relaxed text-muted-foreground">
                    {feat.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} DocuTube AI. Built for developers and product designers.</p>
        </div>
      </footer>
    </div>
  );
}
