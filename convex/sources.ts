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

export const getSources = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const access = await checkWorkspaceAccess(ctx, args.workspaceId);
    if (!access) return [];
    
    return await ctx.db
      .query("sources")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const updateSourceStatus = mutation({
  args: {
    sourceId: v.id("sources"),
    status: v.string(),
    error: v.optional(v.string()),
    content: v.optional(v.string()),
    metadata: v.optional(v.object({
      title: v.optional(v.string()),
      channel: v.optional(v.string()),
      duration: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) throw new Error("Source not found");
    
    const access = await checkWorkspaceAccess(ctx, source.workspaceId!);
    if (!access) throw new Error("Unauthorized");
    
    await ctx.db.patch(args.sourceId, {
      status: args.status,
      ...(args.error !== undefined ? { error: args.error } : {}),
      ...(args.content !== undefined ? { content: args.content } : {}),
      ...(args.metadata !== undefined ? { metadata: args.metadata } : {}),
    });
  },
});
