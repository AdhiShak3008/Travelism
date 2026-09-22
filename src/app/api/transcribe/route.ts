import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/server/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!ENV.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Groq API key not configured for audio transcription." },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file." }, { status: 400 });
    }

    // Determine appropriate file extension based on MIME type
    const mime = file.type || "audio/webm";
    let fileName = "audio.webm";
    if (mime.includes("mp4") || mime.includes("m4a")) {
      fileName = "audio.mp4";
    } else if (mime.includes("wav")) {
      fileName = "audio.wav";
    } else if (mime.includes("ogg")) {
      fileName = "audio.ogg";
    }

    const groqForm = new FormData();
    groqForm.append("file", file, fileName);
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("temperature", "0.0");
    groqForm.append("response_format", "json");

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.GROQ_API_KEY}`,
      },
      body: groqForm,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("[Transcribe] Groq Whisper API error:", groqRes.status, errText);
      return NextResponse.json(
        { error: `Whisper transcription failed: ${groqRes.statusText}` },
        { status: groqRes.status }
      );
    }

    const data = await groqRes.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (err: any) {
    console.error("[Transcribe] Internal error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to transcribe audio." },
      { status: 500 }
    );
  }
}
