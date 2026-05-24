"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  FileText, Cpu, Settings, Code2, CheckSquare, Database, Terminal, 
  Download, Eye, Loader2, CheckCircle2 
} from "lucide-react";

interface DocumentCardProps {
  docType: string;
  content?: string;
  status: "pending" | "processing" | "completed" | "failed";
  onPreview: () => void;
  onDownload: () => void;
  index: number;
}

const docTypeDetails: Record<string, { title: string; desc: string; icon: React.ComponentType<any> }> = {
  prd: {
    title: "Product Requirement Document (PRD)",
    desc: "Defines product features, target audience, scope, user stories, and release requirements.",
    icon: FileText,
  },
  trd: {
    title: "Technical Requirement Document (TRD)",
    desc: "Specifies technical stack, architectural designs, performance goals, and key components.",
    icon: Cpu,
  },
  srs: {
    title: "Software Requirement Specification (SRS)",
    desc: "Covers behavioral specifications, operational environments, constraints, and dependencies.",
    icon: Settings,
  },
  apiDocs: {
    title: "API Documentation",
    desc: "Details REST endpoints, request/response models, authentication mechanisms, and sample payloads.",
    icon: Code2,
  },
  testCases: {
    title: "Test Cases & Scenarios",
    desc: "Outlines functional test inputs, expected behaviors, edge cases, and QA steps.",
    icon: CheckSquare,
  },
  databaseSchema: {
    title: "Database Schema",
    desc: "Defines table structures, columns, types, indexes, primary keys, and entity relations.",
    icon: Database,
  },
  setupGuide: {
    title: "Setup & Installation Guide",
    desc: "Step-by-step commands to clone, install packages, configure env files, and launch locally.",
    icon: Terminal,
  },
};

export default function DocumentCard({ docType, content, status, onPreview, onDownload, index }: DocumentCardProps) {
  const details = docTypeDetails[docType] || {
    title: docType.toUpperCase(),
    desc: "Generated project documentation files.",
    icon: FileText,
  };
  
  const Icon = details.icon;

  // Stagger entrance animation
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: index * 0.08,
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all duration-300 shadow-sm hover:shadow-md ${
        status === "completed" 
          ? "border-border hover:border-red-500/30" 
          : status === "processing"
          ? "border-red-500/40 step-active-pulse"
          : "border-border opacity-70"
      }`}
    >
      <div>
        {/* Header Icon + Status */}
        <div className="flex items-center justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
            status === "completed"
              ? "bg-red-50 text-red-600 group-hover:bg-red-100"
              : status === "processing"
              ? "bg-red-50 text-red-600 animate-pulse"
              : "bg-muted text-muted-foreground"
          }`}>
            <Icon className="h-5.5 w-5.5" />
          </div>

          <div>
            {status === "completed" && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </span>
            )}
            {status === "processing" && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> Drafting
              </span>
            )}
            {status === "pending" && (
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Queued
              </span>
            )}
            {status === "failed" && (
              <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                Failed
              </span>
            )}
          </div>
        </div>

        {/* Title & Desc */}
        <div className="mt-4">
          <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-red-600 transition-colors">
            {details.title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {details.desc}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-6 flex items-center gap-2">
        <button
          disabled={status !== "completed"}
          onClick={onPreview}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2.5 text-xs font-semibold text-foreground transition-all duration-200 ${
            status === "completed"
              ? "hover:bg-muted hover:border-red-500/20 active:scale-95"
              : "opacity-40 cursor-not-allowed"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
        <button
          disabled={status !== "completed"}
          onClick={onDownload}
          className={`flex items-center justify-center rounded-xl p-2.5 border border-border bg-white text-foreground transition-all duration-200 ${
            status === "completed"
              ? "hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-90"
              : "opacity-40 cursor-not-allowed"
          }`}
          title="Download Markdown"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
