import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function checkWorkspaceAccess(ctx: any, workspaceId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
    
  if (!user) return null;
  
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) return null;
  if (workspace.ownerId !== user._id && workspace.ownerId !== identity.tokenIdentifier) return null;
  
  return { user, workspace };
}

// Helper to get thread safely without mutations
async function getThreadSafe(ctx: any, workspaceId: any) {
  return await ctx.db
    .query("chat_threads")
    .withIndex("by_workspace", (q: any) => q.eq("workspaceId", workspaceId))
    .first();
}

// Helper to get or create the default thread for a workspace (Mutations Only)
async function getOrCreateThread(ctx: any, workspaceId: any) {
  let thread = await getThreadSafe(ctx, workspaceId);
    
  if (!thread) {
    const threadId = await ctx.db.insert("chat_threads", {
      workspaceId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    thread = await ctx.db.get(threadId);
  }
  return thread;
}

export const getMessages = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const access = await checkWorkspaceAccess(ctx, args.workspaceId);
    if (!access) return [];
    const thread = await getThreadSafe(ctx, args.workspaceId);
    
    if (!thread) return [];

    return await ctx.db
      .query("chat_messages")
      .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
      .collect();
  },
});

export const sendMessage = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    content: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await checkWorkspaceAccess(ctx, args.workspaceId);
    if (!access) throw new Error("Unauthorized");
    const thread = await getOrCreateThread(ctx, args.workspaceId);

    await ctx.db.insert("chat_messages", {
      threadId: thread!._id,
      content: args.content,
      role: args.role,
      createdAt: Date.now(),
    });
    
    await ctx.db.patch(thread!._id, { updatedAt: Date.now() });
  },
});
