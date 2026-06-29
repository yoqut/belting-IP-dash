import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/yeastar";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const BASE_URL = process.env.YEASTAR_URL?.replace(/\/$/, "") ?? "";

export async function GET() {
  try {
    const token = await getAccessToken();
    const params = new URLSearchParams({ access_token: token, page_number: "1", page_size: "10" });
    const res = await fetch(`${BASE_URL}/openapi/v1.0/extension/list?${params}`, {
      headers: { "Content-Type": "application/json" },
    });
    const raw = await res.json();
    return NextResponse.json({ status: res.status, raw });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
