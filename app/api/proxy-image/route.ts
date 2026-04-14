import { NextRequest, NextResponse } from "next/server"

// Proxies images from Firebase Storage to avoid CORS issues in html2canvas PDF generation.
// Only allows Firebase Storage URLs for security.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return new NextResponse("Missing url", { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse("Forbidden", { status: 403 })
  }
  if (parsed.hostname !== "firebasestorage.googleapis.com") {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const resp = await fetch(url)
    if (!resp.ok) return new NextResponse("Upstream error", { status: 502 })

    const buffer = await resp.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": resp.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return new NextResponse("Failed", { status: 502 })
  }
}
