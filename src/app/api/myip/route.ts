import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://api.ipify.org?format=json").catch(() => null);
  const data = res ? await res.json().catch(() => null) : null;
  return NextResponse.json({ ip: data?.ip ?? "aniqlanmadi" });
}
