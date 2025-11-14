import { supabaseAdmin } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { generateLesson } from "@/lib/lesson-generator"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id") || uuidv4()
    const body = await request.json()
    const { title, description, type } = body

    if (!title || !description || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const traceId = uuidv4()

    // ✅ Use admin client for unrestricted access
    const { data: lesson, error: insertError } = await supabaseAdmin
      .from("lessons")
      .insert([
        {
          session_id: sessionId,
          title,
          description,
          status: "queued",
          content_type: type,
          trace_id: traceId,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error creating lesson in Supabase:", insertError)
      return NextResponse.json({ error: `Database error: ${insertError.message}` }, { status: 500 })
    }

    if (!lesson) {
      return NextResponse.json({ error: "Failed to create lesson record" }, { status: 500 })
    }

    console.log("[v0] Lesson queued, starting async generation:", lesson.id)

    generateLesson(lesson.id, sessionId, title, description, type, traceId).catch((err) => {
      console.error("[v0] Error in background generation:", err)
    })

    return NextResponse.json({ ...lesson, sessionId })
  } catch (error) {
    console.error("[v0] Unexpected error in POST /api/lessons/generate:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
