import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { YoutubeTranscript } from "youtube-transcript";

export async function POST(req: Request) {
  try {
    const { workspaceId } = await req.json();
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Missing workspaceId parameter." }, { status: 400 });
    }

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://example.convex.cloud");
    if (token) {
      convex.setAuth(token);
    }
    
    // Get workspace sources
    const sources = await convex.query(api.sources.getSources, { workspaceId });
    if (!sources || sources.length === 0) {
      return NextResponse.json({ success: false, error: "No sources found for this workspace." }, { status: 404 });
    }

    const source = sources[0];
    if (!source.url) {
      return NextResponse.json({ success: false, error: "Source has no URL." }, { status: 422 });
    }

    // Extract Transcript on the server side
    let transcriptText = "";
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(source.url);
      transcriptText = transcript.map(t => t.text).join(" ");
    } catch (e: any) {
      console.error("Failed to fetch transcript on server:", e);
      return NextResponse.json({ 
        success: false, 
        error: "Could not extract transcript from this video. Ensure it has captions/subtitles available." 
      }, { status: 422 });
    }

    if (!transcriptText || transcriptText.trim().length < 50) {
      return NextResponse.json({ success: false, error: "Transcript is too short or empty." }, { status: 422 });
    }

    return NextResponse.json({ success: true, transcript: transcriptText });
  } catch (error: any) {
    console.error("Transcript Route Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
