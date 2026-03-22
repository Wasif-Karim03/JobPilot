import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { uploadToR2 } from "@/server/services/r2";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

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

    const allowedTypes = ["application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF
    let extractedText = "";
    try {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text?.trim() ?? "";
    } catch {
      return NextResponse.json(
        { error: "Could not read PDF. Make sure it contains selectable text (not a scanned image)." },
        { status: 422 }
      );
    }

    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json(
        { error: "The PDF appears to be a scanned image and cannot be read. Please paste your resume text instead." },
        { status: 422 }
      );
    }

    // Upload to R2
    const key = `resumes/${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const fileUrl = await uploadToR2(key, buffer, file.type);

    return NextResponse.json({
      fileUrl,
      extractedText,
      characterCount: extractedText.length,
    });
  } catch (err) {
    console.error("PDF upload error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
