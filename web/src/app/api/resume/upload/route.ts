import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

export async function POST(req: NextRequest) {
  // Auth check
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text — use internal path to avoid pdf-parse's test-file bug in serverless
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");

    let extractedText = "";
    try {
      const pdfData = await pdfParse(buffer);
      extractedText = (pdfData.text ?? "").trim();
    } catch (parseErr) {
      console.error("pdf-parse error:", parseErr);
      return NextResponse.json(
        {
          error:
            "Could not read this PDF. Make sure it contains real text (not a scanned image). Try the Paste Text tab instead.",
        },
        { status: 422 }
      );
    }

    if (extractedText.length < 50) {
      return NextResponse.json(
        {
          error:
            "The PDF looks like a scanned image — no text could be extracted. Use the Paste Text tab instead.",
        },
        { status: 422 }
      );
    }

    // Try to upload original PDF to R2 (non-blocking — if it fails, we still return the text)
    let fileUrl: string | null = null;
    try {
      const { uploadToR2 } = await import("@/server/services/r2");
      const key = `resumes/${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      fileUrl = await uploadToR2(key, buffer, file.type);
    } catch (r2Err) {
      console.error("R2 upload error (non-fatal):", r2Err);
      // Continue without file URL — text extraction still succeeded
    }

    return NextResponse.json({
      fileUrl,
      extractedText,
      characterCount: extractedText.length,
    });
  } catch (err) {
    console.error("PDF upload route error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
