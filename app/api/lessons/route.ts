// /app/api/lessons/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const supabase = await createClient()
  const sessionId = req.headers.get("x-session-id")

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .order("created_at", { ascending: false })
    .or(`session_id.eq.${sessionId}`)

  if (error) {
    console.error("[v0] Error fetching lessons:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
