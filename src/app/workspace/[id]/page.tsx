"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";
import {
  Youtube, Play, Loader2, Download, ArrowLeft,
  ExternalLink, FileText, CheckCircle2, X, AlertCircle,
  Send, Sparkles, Bot, User, Copy, Check, Info, Cpu, Settings, Code2, CheckSquare, Database, Terminal, Pencil, Key
} from "lucide-react";
import { SignInButton, useAuth, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { decryptApiKey } from "@/utils/crypto";
import MarkdownEditor from "@/components/MarkdownEditor";

// Document Types Mapping
const steps = [
  { id: "prd", name: "PRD", fullName: "Product Requirement Document (PRD)", icon: FileText },
  { id: "trd", name: "TRD", fullName: "Technical Requirement Document (TRD)", icon: Cpu },
  { id: "srs", name: "SRS", fullName: "Software Requirement Specification (SRS)", icon: Settings },
  { id: "apiDocs", name: "API Reference", fullName: "API Documentation Reference", icon: Code2 },
  { id: "testCases", name: "Test Cases", fullName: "QA & Integration Test Cases", icon: CheckSquare },
  { id: "databaseSchema", name: "DB Schema", fullName: "Database Entity Schema", icon: Database },
  { id: "setupGuide", name: "Setup Guide", fullName: "Local Setup & Launch Guide", icon: Terminal },
];

function ChatMessageText({ content, animate, onCharTyped }: { content: string; animate: boolean; onCharTyped?: () => void }) {
  const [displayedText, setDisplayedText] = useState(animate ? "" : content);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    if (!animate) {
      setDisplayedText(content);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      const targetText = contentRef.current;
      if (index < targetText.length) {
        setDisplayedText((prev) => prev + targetText.charAt(index));
        index++;
        if (onCharTyped) onCharTyped();
      }
    }, 15);

    return () => clearInterval(interval);
  }, [animate]); // Only re-run if animate flag changes, not on every content update

  return <p className="whitespace-pre-wrap">{displayedText}</p>;
}

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // Authentication State
  const { isLoading: authLoadingState, isAuthenticated } = useConvexAuth();
  const { getToken, isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Gemini API Key states
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Trackers to prevent duplicate generation runs
  const generationStartedRef = useRef(false);
  const versionTypesRef = useRef<string[]>([]);

  useEffect(() => {
    if (isSignedIn) {
      getToken({ template: "convex" })
        .then((token) => {
          if (!token) setTokenError("Token is null. JWT Template 'convex' might be missing.");
        })
        .catch((err) => {
          setTokenError(err.message || String(err));
          console.error("Error fetching convex token:", err);
        });
    }
  }, [isSignedIn, getToken]);

  // Load and decrypt API key from localStorage on mount/auth load
  useEffect(() => {
    const loadKey = () => {
      if (userLoaded && user) {
        const encryptedBase64 = localStorage.getItem("docutube_gemini_api_key");
        if (encryptedBase64) {
          decryptApiKey(encryptedBase64, user.id)
            .then((key) => {
              setApiKey(key);
            })
            .catch((err) => {
              console.error("Failed to decrypt local API key:", err);
              localStorage.removeItem("docutube_gemini_api_key");
              setApiKey(null);
            });
        } else {
          setApiKey(null);
        }
      }
    };

    loadKey();

    window.addEventListener("apiKeyUpdated", loadKey);
    return () => window.removeEventListener("apiKeyUpdated", loadKey);
  }, [user, userLoaded]);

  const [url, setUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const renameDocument = useMutation(api.workspaces.renameWorkspace);
  const updateStatus = useMutation(api.workspaces.updateWorkspaceStatus);
  const insertVersion = useMutation(api.artifacts.insertArtifact);
  const updateVersionContent = useMutation(api.artifacts.insertRevision);
  const sendMessage = useMutation(api.chat.sendMessage);

  const handleRename = async () => {
    if (!newTitle.trim()) {
      setIsRenaming(false);
      return;
    }
    await renameDocument({ id: id as Id<"workspaces">, name: newTitle.trim() });
    setIsRenaming(false);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasAutoOpened = useRef(false);

  // Prefill project name on mount
  useEffect(() => {
    setProjectName("Project - " + Math.floor(100 + Math.random() * 900));
  }, []);

  // Prefill URL from landing page
  useEffect(() => {
    if (id === "new") {
      const pendingUrl = localStorage.getItem("docutube_pending_url");
      if (pendingUrl) {
        setUrl(pendingUrl);
        localStorage.removeItem("docutube_pending_url");
      }
    }
  }, [id]);

  // Convex Queries & Mutations (only executed if authenticated)
  const document = useQuery(
    api.workspaces.getWorkspace,
    isAuthenticated && id !== "new" ? { id: id as Id<"workspaces"> } : "skip" as any
  );
  const versions = useQuery(
    api.artifacts.getArtifactsWithContent,
    isAuthenticated && id !== "new" ? { workspaceId: id as Id<"workspaces"> } : "skip" as any
  );
  const messages = useQuery(
    api.chat.getMessages,
    isAuthenticated && id !== "new" ? { workspaceId: id as Id<"workspaces"> } : "skip" as any
  );
  const sources = useQuery(
    api.sources.getSources,
    isAuthenticated && id !== "new" ? { workspaceId: id as Id<"workspaces"> } : "skip" as any
  );
  const createWorkspace = useMutation(api.workspaces.createWorkspace);

  // Sync versions array ref to allow seamless client-side generation resumption
  useEffect(() => {
    if (versions) {
      versionTypesRef.current = versions.map((v: any) => v.docType);
    }
  }, [versions]);

  // Progressive Unlocking: Auto-open the first available document while processing
  useEffect(() => {
    if ((document?.status === "processing" || document?.status === "completed") && versions && versions.length > 0) {
      if (!previewDoc && !hasAutoOpened.current) {
        const prdDoc = versions.find((v: any) => v.docType === "prd");
        if (prdDoc && !prdDoc.content.startsWith("# PRD Error")) {
          setPreviewDoc(prdDoc);
          hasAutoOpened.current = true;
        } else if (versions[0] && !versions[0].content.startsWith("# ")) {
          setPreviewDoc(versions[0]);
          hasAutoOpened.current = true;
        }
      }
    }
  }, [versions, document?.status, previewDoc]);

  // Scroll to bottom on new messages
  const handleScrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  };

  useEffect(() => {
    handleScrollToBottom();
  }, [messages, chatLoading]);

  // Client-Side AI Generation loop
  const startClientGeneration = async (docId: string, youtubeUrl: string) => {
    if (!apiKey) {
      alert("Please configure your API key from the top right menu in the Navbar.");
      return;
    }
    if (generationStartedRef.current) return;
    generationStartedRef.current = true;

    try {
      // 1. Update status to processing
      await updateStatus({ id: docId as Id<"workspaces">, status: "processing" });

      // 2. Fetch transcript via proxy
      const token = await getToken({ template: "convex" });
      const transcriptRes = await fetch("/api/transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ workspaceId: docId })
      });

      const transcriptData = await transcriptRes.json();
      if (!transcriptData.success) {
        throw new Error(transcriptData.error || "Failed to fetch transcript.");
      }

      const transcriptText = transcriptData.transcript;

      // 3. Initialize Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Helper to handle Gemini 429 errors with exponential backoff
      const generateWithRetry = async (prompt: string, maxRetries = 3) => {
        let retries = 0;
        while (true) {
          try {
            return await model.generateContent(prompt);
          } catch (error: any) {
            const isRateLimit =
              error.status === 429 ||
              (error.message && error.message.includes("429")) ||
              (error.message && error.message.toLowerCase().includes("quota"));

            if (isRateLimit && retries < maxRetries) {
              retries++;
              const delay = Math.pow(2, retries) * 5000; // 10s, 20s, 40s
              console.log(`Rate limit hit (429). Retrying in ${delay / 1000} seconds... (Attempt ${retries} of ${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw error;
            }
          }
        }
      };

      // 4. Generate Project Name (only if not already set/renamed)
      const docData = document;
      if (!docData?.name || docData.name === "Analyzing Transcript...") {
        try {
          const titlePrompt = `Based on the following YouTube video transcript, generate a short, catchy, and professional project name (maximum 5 words). Return ONLY the project name text, no quotes or extra text.
          Transcript: ${transcriptText.substring(0, 10000)}...`;

          const titleResult = await generateWithRetry(titlePrompt);
          const generatedTitle = titleResult.response.text();

          if (generatedTitle && generatedTitle.trim().length > 0) {
            await renameDocument({
              id: docId as Id<"workspaces">,
              name: generatedTitle.trim()
            });
          }
        } catch (titleErr) {
          console.error("Failed to generate project name:", titleErr);
        }
      }

      // 5. Generate documents sequentially, skipping any already created
      const docTypes = ["prd", "trd", "srs", "apiDocs", "testCases", "databaseSchema", "setupGuide"];
      for (const docType of docTypes) {
        if (versionTypesRef.current.includes(docType)) {
          console.log(`Skipping already generated doc: ${docType}`);
          continue;
        }

        const prompt = `
You are a senior Software Architect, Technical Product Manager, 
and Documentation Engineer with 15+ years of experience.

Your task is to deeply analyze the provided YouTube video transcript 
and generate a highly detailed, production-grade ${docType.toUpperCase()} document.

IMPORTANT INSTRUCTIONS:

- Output ONLY valid Markdown.
- Do NOT include explanations outside the document.
- Do NOT mention AI-generated content.
- Infer architecture, workflows, APIs, database entities, and business logic intelligently from the transcript.
- If some information is missing, make realistic engineering assumptions and clearly label them as:
  "Assumption:"
- Maintain professional enterprise documentation standards.
- Avoid generic filler text.
- Use tables, diagrams (Markdown Mermaid where useful), bullet points, code blocks, and structured sections.
- Make the document implementation-focused and developer-friendly.
- Include edge cases, scalability considerations, security considerations, and performance considerations wherever relevant.
- Preserve technical consistency across all sections.
- If the transcript contains code/framework mentions, use them appropriately.
- Extract actual workflows and technical decisions from the transcript instead of summarizing blindly.

DOCUMENT TYPE REQUIREMENTS:

${docType === "prd"
            ? `
Generate a complete PRD including:
- Executive Summary
- Problem Statement
- Goals & Objectives
- User Personas
- Functional Requirements
- Non-Functional Requirements
- User Stories
- Acceptance Criteria
- KPIs & Success Metrics
- Risks & Mitigations
- Scope (In/Out)
- Future Enhancements
`
            : docType === "trd"
              ? `
Generate a highly technical TRD including:
- System Architecture
- Tech Stack
- Folder Structure
- Database Design
- API Design
- Authentication Flow
- State Management
- Scalability Considerations
- Security Architecture
- Deployment Strategy
- Caching Strategy
- Queue/Worker Systems
- Error Handling
- Logging & Monitoring
- Performance Optimization
- CI/CD Flow
- Infrastructure Design
- Third-party Integrations
- Sequence Diagrams
`
              : docType === "srs"
                ? `
Generate a detailed Software Requirements Specification including:
- System Purpose
- Functional Requirements
- External Interface Requirements
- Constraints
- Assumptions
- System Features
- User Roles
- Validation Rules
- Error Scenarios
`
                : docType === "apiDocs"
                  ? `
Generate complete API Documentation including:
- REST endpoints
- Request/Response schemas
- Authentication
- Error responses
- Rate limiting
- Example payloads
- HTTP status codes
- Validation rules
`
                  : docType === "testCases"
                    ? `
Generate extensive QA test cases including:
- Functional Testing
- Integration Testing
- UI Testing
- Edge Cases
- Security Testing
- Performance Testing
- API Testing
- Negative Test Cases
- Expected Results
- Priority Levels
`
                    : docType === "databaseSchema"
                      ? `
Generate a complete database design including:
- ER diagrams (Mermaid)
- Tables
- Fields
- Relationships
- Indexing Strategy
- Constraints
- Sample Records
- Optimization Notes
`
                      : `
Generate a professional setup and deployment guide including:
- Prerequisites
- Environment Setup
- Installation Steps
- Environment Variables
- Database Setup
- Local Development
- Production Deployment
- Docker Setup
- Troubleshooting
- Common Errors
`
          }

OUTPUT QUALITY RULES:

- Write like documentation used inside a real software company.
- Be extremely specific and implementation-oriented.
- Prefer depth over brevity.
- Avoid repeating the transcript.
- Do not summarize the video.
- Convert the video knowledge into engineering documentation.
- Ensure formatting consistency.
- Use proper Markdown headings hierarchy.
- Generate content that could realistically be handed to developers, QA engineers, DevOps engineers, and stakeholders.

TRANSCRIPT:
${transcriptText.substring(0, 100000)}
`;

        try {
          const result = await generateWithRetry(prompt);
          const response = await result.response;
          const text = response.text();

          await insertVersion({
            workspaceId: docId as Id<"workspaces">,
            type: docType,
            title: docType,
            content: text,
          });

          // Wait 5 seconds between requests to inherently respect Gemini free-tier rate limits
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (err: any) {
          console.error(`Failed to generate ${docType}:`, err);
          await insertVersion({
            workspaceId: docId as Id<"workspaces">,
            type: docType,
            title: docType,
            content: `# ${docType.toUpperCase()} Error\n\nFailed to generate this document using AI: ${err.message || String(err)}`,
          });
        }
      }

      // 6. Complete
      await updateStatus({
        id: docId as Id<"workspaces">,
        status: "completed"
      });

    } catch (err: any) {
      console.error("Client generation failed:", err);
      try {
        await updateStatus({
          id: docId as Id<"workspaces">,
          status: "failed"
        });
      } catch (updateErr) {
        console.error("Failed to update status to failed:", updateErr);
      }
    } finally {
      generationStartedRef.current = false;
    }
  };

  // Trigger client generation if document is pending (or processing but has missing versions)
  useEffect(() => {
    if (document && (document.status === "pending" || document.status === "processing") && apiKey && id && id !== "new") {
      const currentCompleted = versions ? versions.length : 0;
      if (document.status === "pending" || currentCompleted < 7) {
        startClientGeneration(id, sources?.[0]?.url || "");
      }
    }
  }, [document, apiKey, id, versions]);

  // Submit Handler for New Generations
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      alert("Please enter a valid YouTube URL");
      return;
    }

    if (!apiKey) {
      alert("Please configure your API key from the top right menu in the Navbar.");
      return;
    }

    setIsGenerating(true);
    try {
      const newDocId = await createWorkspace({
        youtubeUrl: url,
        name: "Analyzing Transcript...",
      });

      router.push(`/workspace/${newDocId}`);
    } catch (err) {
      console.error("Generation startup failed:", err);
      alert("Could not initialize document workspace. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Chat Submission Handler (Fully Client-Side AI Generation)
  const handleSendChat = async (e?: React.FormEvent, customMessage?: string) => {
    if (e) e.preventDefault();
    const textToSend = customMessage || input;
    if (!textToSend.trim() || chatLoading) return;

    if (!apiKey) {
      alert("Please configure your API key from the top right menu in the Navbar.");
      return;
    }

    setInput("");
    setChatLoading(true);

    try {
      // 1. Save user message to Convex
      await sendMessage({
        workspaceId: id as Id<"workspaces">,
        content: textToSend.trim(),
        role: "user"
      });

      // 2. Fetch transcript via proxy
      const token = await getToken({ template: "convex" });
      const transcriptRes = await fetch("/api/transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ documentId: id })
      });

      let transcriptText = "";
      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json();
        if (transcriptData.success) {
          transcriptText = transcriptData.transcript;
        }
      }
      if (!transcriptText) {
        transcriptText = "[Transcript unavailable or disabled for this video]";
      }

      // 3. Format documents context
      let contextDocs = "";
      if (versions && versions.length > 0) {
        contextDocs = versions
          .map((v: any) => `=== DOCUMENT: ${v.docType.toUpperCase()} ===\n${v.content}`)
          .join("\n\n");
      } else {
        contextDocs = "[No documents generated yet]";
      }

      // 3.5 Format chat history
      let chatHistory = "";
      if (messages && messages.length > 0) {
        // Take the last 10 messages for context
        const recentMessages = messages.slice(-10);
        chatHistory = recentMessages.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n\n");
      }

      // 4. Construct grounded system prompt for Gemini
      const prompt = `You are a highly capable technical research assistant for a project. You have full context of a YouTube video transcript and the generated technical documentation (PRD, TRD, SRS, API, DB Schema, Test Cases, Setup Guide) for this project.

Answer the user's question with high technical accuracy. Ground your responses directly in the transcript and the generated documents provided below. Do not make up information that isn't supported. Be helpful, professional, and clear.

--- BEGIN KNOWLEDGE BASE ---

[SOURCE YOUTUBE VIDEO TRANSCRIPT]
${transcriptText.substring(0, 45000)}

[GENERATED PROJECT DOCUMENTATION FILES]
${contextDocs.substring(0, 45000)}

[RECENT CONVERSATION HISTORY]
${chatHistory ? chatHistory : "[No previous conversation]"}

--- END KNOWLEDGE BASE ---

User Question: ${textToSend.trim()}`;

      // 5. Initialize Gemini and Generate Response
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let responseText = "";
      try {
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          responseText += chunkText;
          setStreamingMessage(responseText);
          handleScrollToBottom();
        }
      } catch (err: any) {
        const isRateLimit =
          err.status === 429 ||
          (err.message && err.message.includes("429")) ||
          (err.message && err.message.toLowerCase().includes("quota"));

        if (isRateLimit) {
          console.log("Rate limited on chat. Retrying in 5 seconds...");
          await new Promise(resolve => setTimeout(resolve, 5000));
          const result = await model.generateContentStream(prompt);
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            responseText += chunkText;
            setStreamingMessage(responseText);
            handleScrollToBottom();
          }
        } else {
          throw err;
        }
      }

      // 6. Save AI message to Convex
      await sendMessage({
        workspaceId: id as Id<"workspaces">,
        content: responseText,
        role: "assistant"
      });
      setStreamingMessage(""); // clear stream state

    } catch (err: any) {
      console.error("Chat AI generation error:", err);
      await sendMessage({
        workspaceId: id as Id<"workspaces">,
        content: `Error generating response: ${err.message || String(err)}. Please try again.`,
        role: "assistant"
      });
    } finally {
      setChatLoading(false);
    }
  };

  // ZIP Downloader
  const handleDownloadAll = () => {
    if (!versions || !document) return;
    const zip = new JSZip();
    versions.forEach((v: any) => zip.file(`${v.docType}.md`, v.content));
    zip.generateAsync({ type: "blob" }).then((content) => {
      const element = window.document.createElement("a");
      element.href = URL.createObjectURL(content);
      element.download = `${document.name || "Untitled"}_Documentation.zip`;
      element.click();
    });
  };

  // Single Markdown Downloader
  const handleDownloadSingle = (docType: string, content: string) => {
    if (!document) return;
    const element = window.document.createElement("a");
    const file = new Blob([content], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `${document.name || "Untitled"}_${docType}.md`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  // Clipboard Copier
  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Markdown Visual Parser
  const renderMarkdownContent = (content: string) => {
    if (!content) return null;
    return content.split("\n").map((line, idx) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-2xl font-extrabold text-foreground mt-8 mb-4 border-b pb-2 tracking-tight">
            {line.replace("# ", "")}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-xl font-bold text-foreground mt-6 mb-3 tracking-tight">
            {line.replace("## ", "")}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-lg font-semibold text-foreground mt-5 mb-2">
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-5 list-disc text-sm text-muted-foreground my-1.5 leading-relaxed">
            {line.substring(2)}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-3" />;
      }
      return (
        <p key={idx} className="text-sm text-muted-foreground my-2 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  // Deriving progress
  const versionTypes = versions ? versions.map((v: any) => v.docType) : [];
  const completedCount = versionTypes.length;
  const progressPercent = Math.min(Math.round((completedCount / 7) * 100), 100);

  // Stepper UI Status Calculator
  const getStepStatus = (stepId: string) => {
    const version = versions?.find((v: any) => v.docType === stepId);
    if (version) {
      if (version.content && version.content.startsWith(`# ${stepId.toUpperCase()} Error`)) {
        return "failed";
      }
      return "completed";
    }

    if (document?.status === "failed") return "failed";

    const nextIncomplete = steps.find((s) => !versionTypes.includes(s.id));
    if (nextIncomplete?.id === stepId && (document?.status === "processing" || document?.status === "pending")) {
      return "processing";
    }

    return "pending";
  };

  // Prompt suggestions for chat empty state
  const chatPrompts = [
    { text: "Summarize the key architectural choices in this project.", label: "Architecture Summary" },
    { text: "Detail the database schemas and relation structures.", label: "DB Structure" },
    { text: "Explain the setup and installation guide steps.", label: "Setup Steps" },
    { text: "List the core user stories and features from the PRD.", label: "Product Features" },
  ];

  // 1. Loading Authentication State
  if (authLoadingState) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-red-600" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Checking authentication...</p>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-white text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md border border-border bg-white rounded-3xl p-8 shadow-xl text-center"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4 shadow-inner">
              <Bot className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-extrabold text-foreground">Authentication Required</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Please sign in to create new document workspaces or view your previous chat histories.
            </p>
            <div className="mt-6 flex justify-center">
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow hover:bg-red-700 active:scale-95 transition-all">
                    Sign In to Workspace
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <button disabled className="flex items-center gap-2 rounded-full bg-red-400 px-6 py-3 text-sm font-bold text-white shadow cursor-not-allowed">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </button>
                {tokenError && (
                  <p className="text-xs text-red-600 mt-4 max-w-sm mx-auto">
                    <strong>Auth Error:</strong> {tokenError}.<br />
                    Please ensure you created the "convex" JWT template in the Clerk Dashboard.
                  </p>
                )}
              </SignedIn>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // 3. Authenticated Logic
  return (
    <div className="relative min-h-screen bg-white text-foreground flex flex-col h-screen overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-full max-w-7xl -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,0,0,0.02),transparent_50%)]" />

      {/* Navbar */}
      <Navbar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* NEW SESSION GENERATION VIEW */}
        {id === "new" ? (
          <main className="flex-1 flex items-center justify-center px-4 py-16 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xl border border-border bg-white rounded-3xl p-8 shadow-xl"
            >
              <div className="text-center mb-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4 shadow-inner">
                  <Youtube className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  New Documentation Session
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                  Provide a YouTube URL of your choice. Our AI will automatically determine the project name from the video transcript and generate structural documents.
                </p>
              </div>

              <form onSubmit={handleGenerate} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="youtubeUrl" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    YouTube URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Youtube className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="youtubeUrl"
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-2xl border border-border bg-white pl-11 pr-4 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isGenerating}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-muted text-white disabled:text-muted-foreground rounded-2xl font-bold shadow-lg shadow-red-600/10 flex items-center justify-center gap-2 transition-all mt-6"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating workspace...
                    </>
                  ) : (
                    <>
                      <Play className="h-4.5 w-4.5 fill-current" />
                      Generate Workspace
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </main>
        ) : (
          /* ACTIVE SESSION VIEW (LOADING / PROCESSING / COMPLETED) */
          <main className="flex-1 flex flex-col overflow-hidden">
            {document === undefined ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-red-600" />
                <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading workspace...</p>
              </div>
            ) : !document ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-3 animate-bounce" />
                <h2 className="text-xl font-bold text-foreground">Workspace Not Found</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">This session might have been deleted or does not exist.</p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-6 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-semibold shadow hover:bg-red-700 transition"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              // Workspace exists
              <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Stepper / Processing State */}
                {(document.status === "pending" || document.status === "processing") && (
                  <div className="max-w-2xl w-full mx-auto my-auto py-12 px-4 space-y-8 overflow-y-auto">
                    <div className="text-center space-y-2.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mx-auto shadow-inner">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                      <h2 className="text-xl font-extrabold text-foreground">Drafting Documents</h2>
                      <p className="text-xs text-muted-foreground">
                        Gemini is building your technical documents sequentially to avoid rate boundaries.
                      </p>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-muted-foreground px-1">
                        <span>PROGRESS</span>
                        <span>{progressPercent}% COMPLETE</span>
                      </div>
                      <div className="w-full bg-muted h-3 rounded-full overflow-hidden shadow-inner border border-border">
                        <motion.div
                          className="bg-red-600 h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* Sequential Steps List */}
                    <div className="border border-border bg-white rounded-2xl p-6 shadow-sm space-y-4">
                      {steps.map((step, idx) => {
                        const status = getStepStatus(step.id);
                        return (
                          <div
                            key={step.id}
                            className={`flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0 border-border/60 ${status === "pending" ? "opacity-45" : ""
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-all ${status === "completed"
                                ? "bg-green-50 border-green-200 text-green-600"
                                : status === "failed"
                                  ? "bg-red-100 border-red-300 text-red-700"
                                  : status === "processing"
                                    ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                                    : "bg-muted border-border text-muted-foreground"
                                }`}>
                                {status === "completed" ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : status === "failed" ? (
                                  <AlertCircle className="h-4 w-4" />
                                ) : status === "processing" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  idx + 1
                                )}
                              </div>
                              <span className={`text-sm font-semibold transition-colors ${status === "processing" ? "text-red-600 font-bold" : status === "failed" ? "text-red-700 font-bold line-through opacity-75" : "text-foreground"
                                }`}>
                                {step.name}
                              </span>
                            </div>

                            <div>
                              {status === "completed" && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                  Done
                                </span>
                              )}
                              {status === "failed" && (
                                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                  Failed
                                </span>
                              )}
                              {status === "processing" && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                                  Writing...
                                </span>
                              )}
                              {status === "pending" && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                  Queued
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Failed State */}
                {document.status === "failed" && (
                  <div className="max-w-md w-full mx-auto my-auto p-8 border border-border bg-white rounded-3xl shadow-xl text-center">
                    <AlertCircle className="h-14 w-14 text-red-600 mx-auto mb-4 animate-pulse" />
                    <h2 className="text-xl font-bold text-foreground">Generation Failed</h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      We ran into an error extracting the video details or compiling the AI document. Please make sure the YouTube video has accessible English transcripts.
                    </p>
                    <div className="mt-6 flex gap-3 justify-center">
                      <button
                        onClick={() => router.push("/workspace/new")}
                        className="rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-red-700 transition"
                      >
                        Try Another Video
                      </button>
                      <button
                        onClick={() => router.push("/dashboard")}
                        className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted transition"
                      >
                        Dashboard
                      </button>
                    </div>
                  </div>
                )}

                {/* COMPLETED CHAT WORKSPACE */}
                {document.status === "completed" && (
                  <div className="flex-1 flex flex-col overflow-hidden h-full">

                    {/* Header bar */}
                    <div className="border-b border-border bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                      <div>
                        {isRenaming ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleRename()}
                              className="text-xl font-extrabold tracking-tight text-foreground border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                              autoFocus
                            />
                            <button onClick={handleRename} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setIsRenaming(false)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setIsRenaming(true); setNewTitle(document.name || ""); }}>
                            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                              {document.name || "Untitled"}
                            </h1>
                            <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted rounded-lg transition" title="Rename project">
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        )}
                        <a
                          href={sources?.[0]?.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:text-red-600 transition flex items-center gap-1 mt-0.5 font-medium"
                        >
                          <Youtube className="h-3.5 w-3.5 text-red-500" />
                          <span>Watch video</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadAll}
                          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition"
                        >
                          <Download className="h-3.5 w-3.5" /> Download Docs (ZIP)
                        </button>
                      </div>
                    </div>

                    {/* Connected Knowledge Sources bar */}
                    <div className="bg-muted/30 border-b border-border/80 px-6 py-3 shrink-0">
                      <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center gap-2.5">
                        <span className="text-[10px] font-extrabold text-muted-foreground tracking-wider shrink-0 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-red-500" /> ACTIVE KNOWLEDGE BASE:
                        </span>

                        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                          {/* Transcript source pill */}
                          <button
                            onClick={() => alert("The complete YouTube video transcript is embedded directly into the AI's contextual knowledge base and fully accessible.")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 border border-red-100 text-red-600 shadow-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            YouTube Transcript
                          </button>

                          {/* Document specification pills */}
                          {steps.map((step) => {
                            const matchingVersion = versions?.find((v: any) => v.docType === step.id);
                            const isReady = !!matchingVersion;
                            const isActive = previewDoc?.docType === step.id;
                            return (
                              <button
                                key={step.id}
                                disabled={!isReady}
                                onClick={() => {
                                  if (isReady) {
                                    setPreviewDoc(matchingVersion);
                                    setIsEditing(false);
                                  }
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${isActive
                                    ? "bg-red-600 border-red-600 text-white shadow-md shadow-red-600/20 scale-105"
                                    : isReady
                                      ? "bg-white border-border hover:border-red-500/20 text-foreground shadow-sm active:scale-95"
                                      : "bg-muted border-border/40 text-muted-foreground/60 cursor-not-allowed"
                                  }`}
                                title={isReady ? `Preview ${step.fullName}` : "Generating..."}
                              >
                                {isReady && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white shadow-sm" : "bg-green-500"}`} />
                                )}
                                {step.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Main Workspace Frame */}
                    <div className="flex-1 flex flex-col overflow-hidden relative">

                      {/* Document Preview Overlay Drawer */}
                      <AnimatePresence>
                        {previewDoc && (
                          <motion.div
                            initial={{ opacity: 0, x: "100%" }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: "100%" }}
                            transition={{ type: "spring", stiffness: 380, damping: 35 }}
                            className="absolute inset-0 z-30 bg-white flex flex-col"
                          >
                            {/* Drawer Header */}
                            <div className="border-b border-border bg-white px-6 py-4 flex items-center justify-between shrink-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setPreviewDoc(null)}
                                  className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition active:scale-90"
                                >
                                  <ArrowLeft className="h-4.5 w-4.5" />
                                </button>
                                <div>
                                  <h3 className="text-base font-extrabold text-foreground">
                                    {steps.find(s => s.id === previewDoc.docType)?.fullName || previewDoc.docType.toUpperCase()}
                                  </h3>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Specifications generated from video transcript</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => setIsEditing(false)}
                                      className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition active:scale-95"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await updateVersionContent({
                                          artifactId: previewDoc._id, createdBy: "user",
                                          content: editContent
                                        });
                                        setPreviewDoc({ ...previewDoc, content: editContent });
                                        setIsEditing(false);
                                      }}
                                      className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md transition active:scale-95"
                                    >
                                      Save Changes
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditContent(previewDoc.content);
                                      setIsEditing(true);
                                    }}
                                    className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition active:scale-95 text-red-600 hover:text-red-700"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span>Edit</span>
                                  </button>
                                )}
                                <div className="w-px h-6 bg-border mx-1"></div>
                                <button
                                  onClick={() => handleCopyToClipboard(previewDoc.content)}
                                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition active:scale-95"
                                >
                                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                  <span>{copied ? "Copied!" : "Copy"}</span>
                                </button>
                                <button
                                  onClick={() => handleDownloadSingle(previewDoc.docType, previewDoc.content)}
                                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition active:scale-95"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setPreviewDoc(null);
                                    setIsEditing(false);
                                  }}
                                  className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition active:scale-95"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Drawer Content */}
                            <div data-lenis-prevent className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full">
                              <MarkdownEditor
                                key={previewDoc._id + "_" + (isEditing ? "edit" : "view")}
                                markdown={(isEditing ? editContent : previewDoc.content).replace(/<br>/gi, "<br />").replace(/<hr>/gi, "<hr />")}
                                readOnly={!isEditing}
                                onChange={setEditContent}
                                contentEditableClassName="prose prose-red max-w-none focus:outline-none"
                                className={!isEditing ? "mdx-read-only" : "mdx-editing border border-border rounded-xl p-4"}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ChatGPT-style Conversation space */}
                      <div data-lenis-prevent className="flex-1 overflow-y-auto px-4 py-8 flex flex-col">
                        <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-between">

                          {/* Messages list */}
                          {messages === undefined ? (
                            <div className="flex h-full items-center justify-center flex-1">
                              <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                            </div>
                          ) : messages.length === 0 ? (
                            // Empty State / Welcome Screen
                            <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-5 shadow-inner">
                                <Sparkles className="h-7 w-7" />
                              </div>
                              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                                How can I help you build?
                              </h2>
                              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                                I have complete contextual knowledge of the YouTube transcript and all 7 generated document specs. Ask me anything about this project.
                              </p>

                              {/* Suggestion prompt cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 max-w-2xl w-full text-left">
                                {chatPrompts.map((p, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleSendChat(undefined, p.text)}
                                    className="p-4 rounded-2xl border border-border bg-white text-left transition-all hover:bg-muted/50 hover:border-red-500/20 active:scale-98 shadow-sm flex flex-col justify-between group"
                                  >
                                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1 group-hover:text-red-700">
                                      {p.label}
                                    </span>
                                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-normal">
                                      {p.text}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            // Message Thread
                            <div className="space-y-6 pb-8">
                              {messages.map((msg, idx) => {
                                const isUser = msg.role === "user";
                                return (
                                  <div
                                    key={msg._id}
                                    className={`flex items-start gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                                  >
                                    {!isUser && (
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-sm mt-0.5">
                                        <Bot className="h-4.5 w-4.5" />
                                      </div>
                                    )}

                                    <div
                                      className={`max-w-[80%] rounded-2xl px-4 py-3.5 shadow-sm text-sm leading-relaxed ${isUser
                                        ? "bg-red-600 text-white rounded-tr-none"
                                        : "bg-muted text-foreground rounded-tl-none border border-border/30"
                                        }`}
                                    >
                                      {isUser ? (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                      ) : (
                                        <ChatMessageText
                                          content={msg.content || ""}
                                          animate={false}
                                          onCharTyped={handleScrollToBottom}
                                        />
                                      )}
                                    </div>

                                    {isUser && (
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border mt-0.5">
                                        <User className="h-4.5 w-4.5" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Chat Loading / Streaming Bubble */}
                          {chatLoading && (
                            <div className="flex items-start gap-4 justify-start mb-6">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-sm mt-0.5">
                                <Bot className="h-4.5 w-4.5" />
                              </div>
                              <div className="bg-muted text-foreground px-4 py-3.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 border border-border/30 max-w-[80%] text-sm leading-relaxed">
                                {streamingMessage ? (
                                  <ChatMessageText
                                    content={streamingMessage}
                                    animate={true}
                                    onCharTyped={handleScrollToBottom}
                                  />
                                ) : (
                                  <>
                                    <span className="typing-dot h-2.5 w-2.5 rounded-full bg-red-600" />
                                    <span className="typing-dot h-2.5 w-2.5 rounded-full bg-red-600" />
                                    <span className="typing-dot h-2.5 w-2.5 rounded-full bg-red-600" />
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          <div ref={chatEndRef} />
                        </div>
                      </div>

                      {/* ChatGPT-style Pinned Input Bar */}
                      <div className="shrink-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-6 px-4">
                        <div className="max-w-3xl w-full mx-auto relative">
                          
                          {/* Contextual Smart Prompts */}
                          {previewDoc && !chatLoading && (
                            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 opacity-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                              {(() => {
                                const prompts = (() => {
                                  switch (previewDoc.docType) {
                                    case "prd": return ["Summarize PRD", "Find edge cases", "Suggest personas"];
                                    case "trd": return ["Explain architecture", "Tech stack alternatives?", "Security risks?"];
                                    case "srs": return ["List functional reqs", "What are constraints?", "Validation rules?"];
                                    case "apiDocs": return ["Write cURL request", "What are rate limits?", "Mock JSON response"];
                                    case "testCases": return ["Write Cypress script", "List negative cases", "Summarize UI tests"];
                                    case "databaseSchema": return ["Write SQL migration", "Suggest DB indexes", "Explain ER diagram"];
                                    case "setupGuide": return ["Summarize deployment", "How to run locally?", "List env vars"];
                                    default: return ["Explain document", "Summarize key points", "Missing info?"];
                                  }
                                })();
                                return prompts.map((promptText, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleSendChat(undefined, promptText)}
                                    className="whitespace-nowrap rounded-full bg-white border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-red-500/30 hover:bg-red-50 transition-all shadow-sm flex-shrink-0"
                                  >
                                    {promptText}
                                  </button>
                                ));
                              })()}
                            </div>
                          )}

                          <form onSubmit={handleSendChat} className="relative">
                            <input
                              type="text"
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Ask DocuTube AI about this video or specs..."
                              disabled={chatLoading}
                              className="w-full rounded-2xl border border-border bg-white pl-4 pr-14 py-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all shadow-md placeholder-muted-foreground disabled:bg-muted"
                            />
                            <motion.button
                              type="submit"
                              whileTap={{ scale: 0.92 }}
                              disabled={chatLoading || !input.trim()}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow transition-all hover:bg-red-700 active:scale-95 disabled:bg-muted disabled:text-muted-foreground"
                            >
                              <Send className="h-4 w-4" />
                            </motion.button>
                          </form>
                          <p className="text-[10px] text-muted-foreground/75 text-center mt-2.5">
                            Grounded AI assistant has full context of the YouTube transcript and generated document specs.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}

