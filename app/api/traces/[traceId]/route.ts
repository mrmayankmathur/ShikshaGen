import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { traceId: string } }) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: trace, error } = await supabase.from("traces").select("*").eq("trace_id", params.traceId).single()

    if (error) {
      console.error("[v0] Error fetching trace:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Verify user owns this trace
    const { data: lesson } = await supabase.from("lessons").select("user_id").eq("id", trace.lesson_id).single()

    if (!lesson || lesson.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(trace)
  } catch (error) {
    console.error("[v0] Unexpected error in GET /api/traces:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
