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

export const listArtifacts = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const access = await checkWorkspaceAccess(ctx, args.workspaceId);
    if (!access) return [];
    
    return await ctx.db
      .query("artifacts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const getArtifactsWithContent = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const access = await checkWorkspaceAccess(ctx, args.workspaceId);
    if (!access) return [];
    
    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const results = [];
    for (const artifact of artifacts) {
      const latestRevision = await ctx.db
        .query("artifact_revisions")
        .withIndex("by_artifact", (q) => q.eq("artifactId", artifact._id))
        .order("desc")
        .first();
        
      results.push({
        ...artifact,
        docType: artifact.type, // Map for frontend compatibility
        content: latestRevision?.content || "",
        version: latestRevision?.versionNumber || 1,
      });
    }
    return results;
  },
});

export const getArtifactRevisions = query({
  args: { artifactId: v.id("artifacts") },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) return [];
    
    const access = await checkWorkspaceAccess(ctx, artifact.workspaceId!);
    if (!access) return [];
    
    return await ctx.db
      .query("artifact_revisions")
      .withIndex("by_artifact", (q) => q.eq("artifactId", args.artifactId))
      .order("desc") // newest first
      .collect();
  },
});

export const insertArtifact = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    type: v.string(),
    title: v.string(),
    content: v.string(), // initial content
  },
  handler: async (ctx, args) => {
    const access = await checkWorkspaceAccess(ctx, args.workspaceId);
    if (!access) throw new Error("Unauthorized");
    
    const artifactId = await ctx.db.insert("artifacts", {
      workspaceId: args.workspaceId,
      type: args.type,
      title: args.title,
      status: "published",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    await ctx.db.insert("artifact_revisions", {
      artifactId,
      content: args.content,
      versionNumber: 1,
      createdBy: "ai",
      createdAt: Date.now(),
    });
    
    return artifactId;
  },
});

export const insertRevision = mutation({
  args: {
    artifactId: v.id("artifacts"),
    content: v.string(),
    createdBy: v.string(), // 'ai' or 'user'
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) throw new Error("Artifact not found");
    
    const access = await checkWorkspaceAccess(ctx, artifact.workspaceId!);
    if (!access) throw new Error("Unauthorized");
    
    // Get latest revision to increment version
    const latestRevision = await ctx.db
      .query("artifact_revisions")
      .withIndex("by_artifact", (q) => q.eq("artifactId", args.artifactId))
      .order("desc")
      .first();
      
    const newVersion = (latestRevision?.versionNumber || 0) + 1;
    
    await ctx.db.insert("artifact_revisions", {
      artifactId: args.artifactId,
      content: args.content,
      versionNumber: newVersion,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
    
    await ctx.db.patch(args.artifactId, { updatedAt: Date.now() });
  },
});
