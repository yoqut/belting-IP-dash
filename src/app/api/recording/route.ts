import { NextRequest, NextResponse } from "next/server";
import { getRecordingDownloadUrl } from "@/lib/yeastar";

export async function GET(req: NextRequest) {
  const recId = req.nextUrl.searchParams.get("id");
  if (!recId) return NextResponse.json({ error: "id kerak" }, { status: 400 });

  const url = await getRecordingDownloadUrl(Number(recId));
  if (!url) return NextResponse.json({ error: "Yozuv topilmadi" }, { status: 404 });

  // access_token URL ga qo'shib Yeastar dan audio olamiz
  const { getAccessToken } = await import("@/lib/yeastar");
  const token = await getAccessToken();
  const urlWithToken = url.includes("?")
    ? `${url}&access_token=${token}`
    : `${url}?access_token=${token}`;

  const res = await fetch(urlWithToken, {
    headers: { "User-Agent": "YeastarDashboard/1.0" },
  });

  if (!res.ok) return NextResponse.json({ error: "Yozuv yuklab bo'lmadi" }, { status: 502 });

  const contentType = res.headers.get("content-type") ?? "audio/wav";
  const buffer = await res.arrayBuffer();

  const isDownload = req.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": isDownload
        ? `attachment; filename="recording-${recId}.wav"`
        : `inline; filename="recording-${recId}.wav"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
