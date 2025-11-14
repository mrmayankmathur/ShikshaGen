import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GenerateLessonRequest {
  lessonId: string;
  outline: string;
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY!;

    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { lessonId, outline }: GenerateLessonRequest = await req.json();

    const systemPrompt = `
You are an expert educator and TypeScript developer. Your task is to generate a complete, self-contained TypeScript React component based on the lesson outline provided.

IMPORTANT RULES:
1. Generate ONLY valid TypeScript/React code
2. The component must be a default export
3. Use functional components with TypeScript
4. Include proper type annotations
5. The component should be visually appealing with Tailwind CSS classes
6. Make it interactive and educational where appropriate
7. Do NOT include any imports - the component will be evaluated in an environment where React is available
8. Do NOT use markdown code blocks - return pure TypeScript code only
9. The component must render educational content based on the outline
10. Use modern React patterns (hooks, etc.)
11. Make the design clean, professional, and engaging
12. For quizzes/tests, include interactive elements
13. For explanations, use clear sections with examples
14. For one-pagers, make them comprehensive but concise
`;

    const userPrompt = `
Generate a complete TypeScript React component for the following lesson outline:

"${outline}"

Remember: Return ONLY the TypeScript code, no markdown, no explanations, no code blocks.
`;

    const fullPrompt = `${systemPrompt}\n\nUser Request:\n${userPrompt}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    let generatedCode = data.candidates[0].content.parts[0].text.trim();
    if (generatedCode.startsWith('```')) {
      generatedCode = generatedCode.replace(/^```(?:typescript|tsx)?\n/, '').replace(/\n```$/, '');
    }

    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        status: 'generated',
        typescript_code: generatedCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`);
    }

    return NextResponse.json(
      { success: true, lessonId, message: 'Lesson generated successfully' },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error generating lesson:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    try {
      const { lessonId } = await req.json();
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase
        .from('lessons')
        .update({
          status: 'error',
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId);
    } catch (dbError) {
      console.error('Failed to update error status:', dbError);
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500, headers: corsHeaders });
  }
}
