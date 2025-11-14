import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { lessonId: string } }) {
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

    // Fetch lesson
    const { data: lesson, error } = await supabase.from("lessons").select("*").eq("id", params.lessonId).single()

    if (error) {
      console.error("[v0] Error fetching lesson:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Verify user owns this lesson
    if (lesson.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(lesson)
  } catch (error) {
    console.error("[v0] Unexpected error in GET /api/lessons/[lessonId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
