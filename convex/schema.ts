import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    preferences: v.optional(v.object({
      theme: v.optional(v.string()),
    })),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  workspaces: defineTable({
    ownerId: v.optional(v.union(v.id("users"), v.string())),
    name: v.optional(v.string()),
    projectName: v.optional(v.string()), // legacy
    title: v.optional(v.string()), // legacy
    status: v.optional(v.string()), 
    metadata: v.optional(v.any()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_owner", ["ownerId"]),

  sources: defineTable({
    workspaceId: v.optional(v.union(v.id("workspaces"), v.string())),
    type: v.optional(v.string()), 
    url: v.optional(v.string()),
    content: v.optional(v.string()), 
    metadata: v.optional(v.any()),
    status: v.optional(v.string()), 
    error: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  }).index("by_workspace", ["workspaceId"]),

  artifacts: defineTable({
    workspaceId: v.optional(v.union(v.id("workspaces"), v.string())),
    type: v.optional(v.string()), 
    title: v.optional(v.string()),
    status: v.optional(v.string()), 
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_workspace", ["workspaceId"]),

  artifact_revisions: defineTable({
    artifactId: v.optional(v.id("artifacts")),
    content: v.optional(v.string()), 
    versionNumber: v.optional(v.number()),
    createdBy: v.optional(v.string()), 
    createdAt: v.optional(v.number()),
  }).index("by_artifact", ["artifactId"]),

  chat_threads: defineTable({
    workspaceId: v.optional(v.union(v.id("workspaces"), v.string())),
    artifactId: v.optional(v.id("artifacts")), 
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_workspace", ["workspaceId"]),

  chat_messages: defineTable({
    threadId: v.optional(v.id("chat_threads")),
    documentId: v.optional(v.string()), // legacy
    role: v.optional(v.string()), 
    content: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.optional(v.number()),
  }).index("by_thread", ["threadId"]),
});
