import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to get the internal user ID
async function getUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
    
  if (!user) return null;
  return { convexId: user._id, clerkId: identity.tokenIdentifier };
}

export const createWorkspace = mutation({
  args: {
    name: v.string(),
    youtubeUrl: v.string(), // We take this to immediately create a source
  },
  handler: async (ctx, args) => {
    const userIds = await getUserId(ctx);
    if (!userIds) throw new Error("Unauthorized");

    const workspaceId = await ctx.db.insert("workspaces", {
      ownerId: userIds.convexId,
      name: args.name,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Also create the initial source for this workspace
    await ctx.db.insert("sources", {
      workspaceId,
      type: "youtube",
      url: args.youtubeUrl,
      status: "pending",
      createdAt: Date.now(),
    });

    return workspaceId;
  },
});

export const getWorkspace = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userIds = await getUserId(ctx);
    if (!userIds) return null;
    const workspace = await ctx.db.get(args.id);
    
    if (!workspace) return null;
    if (workspace.ownerId !== userIds.convexId && workspace.ownerId !== userIds.clerkId) return null;
    
    // Patch for workspaces created with the incorrect 'active' status
    if (workspace.status === "active") {
      workspace.status = "pending";
    }
    
    return workspace;
  },
});

export const listWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const userIds = await getUserId(ctx);
    if (!userIds) return [];
    
    const newWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", userIds.convexId))
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();
      
    const oldWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", userIds.clerkId))
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();
      
    return [...newWorkspaces, ...oldWorkspaces]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 50);
  },
});

export const renameWorkspace = mutation({
  args: {
    id: v.id("workspaces"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userIds = await getUserId(ctx);
    if (!userIds) throw new Error("Unauthorized");
    const workspace = await ctx.db.get(args.id);
    
    if (!workspace) throw new Error("Workspace not found");
    if (workspace.ownerId !== userIds.convexId && workspace.ownerId !== userIds.clerkId) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { 
      name: args.name, 
      updatedAt: Date.now() 
    });
  },
});

export const updateWorkspaceStatus = mutation({
  args: {
    id: v.id("workspaces"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userIds = await getUserId(ctx);
    if (!userIds) throw new Error("Unauthorized");
    const workspace = await ctx.db.get(args.id);
    
    if (!workspace) throw new Error("Workspace not found");
    if (workspace.ownerId !== userIds.convexId && workspace.ownerId !== userIds.clerkId) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { 
      status: args.status, 
      updatedAt: Date.now() 
    });
  },
});

export const deleteWorkspace = mutation({
  args: {
    id: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userIds = await getUserId(ctx);
    if (!userIds) throw new Error("Unauthorized");
    const workspace = await ctx.db.get(args.id);
    
    if (!workspace) throw new Error("Workspace not found");
    if (workspace.ownerId !== userIds.convexId && workspace.ownerId !== userIds.clerkId) throw new Error("Unauthorized");

    // Cascading delete for sources
    const sources = await ctx.db.query("sources").withIndex("by_workspace", (q) => q.eq("workspaceId", args.id)).collect();
    for (const source of sources) await ctx.db.delete(source._id);

    // Cascading delete for artifacts and their revisions
    const artifacts = await ctx.db.query("artifacts").withIndex("by_workspace", (q) => q.eq("workspaceId", args.id)).collect();
    for (const artifact of artifacts) {
      const revisions = await ctx.db.query("artifact_revisions").withIndex("by_artifact", (q) => q.eq("artifactId", artifact._id)).collect();
      for (const rev of revisions) await ctx.db.delete(rev._id);
      await ctx.db.delete(artifact._id);
    }

    // Cascading delete for chat threads and messages
    const threads = await ctx.db.query("chat_threads").withIndex("by_workspace", (q) => q.eq("workspaceId", args.id)).collect();
    for (const thread of threads) {
      const messages = await ctx.db.query("chat_messages").withIndex("by_thread", (q) => q.eq("threadId", thread._id)).collect();
      for (const msg of messages) await ctx.db.delete(msg._id);
      await ctx.db.delete(thread._id);
    }

    // Finally delete workspace
    await ctx.db.delete(args.id);
  },
});
