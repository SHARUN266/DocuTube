"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderKanban, Plus, Youtube, FileText, Trash2, Edit2, Check, X, 
  ExternalLink, Calendar, Loader2, Sparkles, AlertCircle, ArrowRight
} from "lucide-react";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const router = useRouter();
  const workspaces = useQuery(api.workspaces.listWorkspaces);
  const renameWorkspace = useMutation(api.workspaces.renameWorkspace);
  const deleteWorkspace = useMutation(api.workspaces.deleteWorkspace);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const handleSaveEdit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await renameWorkspace({ id: id as Id<"workspaces">, name: editTitle.trim() });
      setEditingId(null);
    } catch (err) {
      console.error("Failed to rename workspace:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this workspace? This will delete all generated documents and chat histories permanently.")) return;
    try {
      await deleteWorkspace({ id: id as Id<"workspaces"> });
    } catch (err) {
      console.error("Failed to delete workspace:", err);
    }
  };

  const handleCardClick = (id: string) => {
    if (editingId) return;
    router.push(`/workspace/${id}`);
  };

  return (
    <div className="relative min-h-screen bg-white text-foreground flex flex-col">
      {/* Background decoration */}
      <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-full max-w-7xl -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,0,0,0.02),transparent_50%)]" />

      {/* Navigation */}
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col">
        
        {/* Header Title & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 mb-8 shrink-0">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-red-600" />
              My Workspaces
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and access your video documentation workspaces</p>
          </div>

          <Link href="/workspace/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-red-700 active:scale-95 transition"
            >
              <Plus className="h-4.5 w-4.5" />
              Create Workspace
            </motion.button>
          </Link>
        </div>

        {/* Workspaces Grid */}
        <div className="flex-1">
          {workspaces === undefined ? (
            // Loading skeleton grid
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 w-full animate-pulse rounded-2xl bg-muted border border-border" />
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            // Empty State with Examples
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border bg-muted/30 rounded-3xl p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 mb-4 shadow-inner">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-extrabold text-foreground">Welcome to your Dashboard</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                  Start by pasting a YouTube video URL, or check out the examples below to see what you can generate.
                </p>
                <Link href="/workspace/new" className="mt-6">
                  <button className="flex items-center gap-1.5 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-red-700 transition hover:scale-105 active:scale-95">
                    <Plus className="h-4.5 w-4.5" />
                    Create First Workspace
                  </button>
                </Link>
              </div>

              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Example Outputs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Example 1 */}
                  <div className="group relative border border-border bg-white rounded-2xl p-6 transition-all hover:shadow-md cursor-not-allowed opacity-80 grayscale-[50%]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                        <Calendar className="h-3.5 w-3.5" />
                        Example
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-foreground leading-snug">
                        Netflix System Design Architecture
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2">Shows PRD, TRD, and Database schemas for a streaming platform.</p>
                    </div>
                    <div className="mt-6 border-t border-border/60 pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div className="flex h-5.5 w-5.5 items-center justify-center rounded-md bg-green-50 text-green-600">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Example 2 */}
                  <div className="group relative border border-border bg-white rounded-2xl p-6 transition-all hover:shadow-md cursor-not-allowed opacity-80 grayscale-[50%]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                        <Calendar className="h-3.5 w-3.5" />
                        Example
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-foreground leading-snug">
                        Building a REST API with Node.js
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2">Includes API Documentation, Setup Guide, and Test Cases.</p>
                    </div>
                    <div className="mt-6 border-t border-border/60 pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div className="flex h-5.5 w-5.5 items-center justify-center rounded-md bg-green-50 text-green-600">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // History list
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workspaces.map((ws: any, idx: number) => {
                const displayTitle = ws.name || "Untitled Workspace";
                const isEditing = editingId === ws._id;
                const formattedDate = new Date(ws.createdAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                });

                return (
                  <motion.div
                    key={ws._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.25 }}
                    onClick={() => handleCardClick(ws._id)}
                    whileHover={{ y: -3 }}
                    className="group relative border border-border bg-white rounded-2xl p-6 transition-all hover:shadow-md hover:border-red-500/20 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header (Actions and Date) */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                          <Calendar className="h-3.5 w-3.5 text-red-500" />
                          {formattedDate}
                        </span>

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleSaveEdit(e, ws._id)}
                                className="rounded-lg p-1.5 bg-red-50 text-red-600 hover:bg-red-100 transition"
                                title="Save"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(null);
                                }}
                                className="rounded-lg p-1.5 bg-muted text-muted-foreground hover:bg-accent transition"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleStartEdit(e, ws._id, displayTitle)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                                title="Rename Workspace"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, ws._id)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
                                title="Delete Workspace"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Body (Title and Source Link) */}
                      <div>
                        {isEditing ? (
                          <div onClick={(e) => e.stopPropagation()} className="mt-1">
                            <input
                              ref={inputRef}
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(e as any, ws._id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="w-full rounded-xl border border-red-500/30 bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-600"
                            />
                          </div>
                        ) : (
                          <h3 className="text-base font-extrabold text-foreground leading-snug group-hover:text-red-600 transition-colors truncate">
                            {displayTitle}
                          </h3>
                        )}
                      </div>
                    </div>

                    {/* Card Footer (Status and Document Badges) */}
                    <div className="mt-6 border-t border-border/60 pt-4 flex items-center justify-between">
                      {ws.status === "completed" ? (
                        <div className="flex items-center gap-1">
                          <div className="flex h-5.5 w-5.5 items-center justify-center rounded-md bg-green-50 text-green-600">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Ready
                          </span>
                        </div>
                      ) : ws.status === "processing" ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Processing...
                        </span>
                      ) : ws.status === "failed" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}

                      <span className="text-xs font-bold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
