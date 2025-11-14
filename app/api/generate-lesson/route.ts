import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as prettier from 'prettier';

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
    // For completeness (in case browsers issue OPTIONS to this same origin)
    return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        // Server-only envs (do NOT expose service role key to client)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY!;
        const githubToken = process.env.GITHUB_TOKEN!;

        if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey || !githubToken) {
            throw new Error('Missing required server environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { lessonId, outline } = (await req.json()) as GenerateLessonRequest;

        // Build prompts (trim / sanitize as needed)
        const systemPrompt = `
          You are an elite React/TypeScript developer. Your SOLE task is to generate a single, 100% syntactically correct, runnable React component.
          
          You will be given a lesson outline. You must return a complete, interactive, and beautifully styled component for it.

          --- CRITICAL FAILURE-STATE RULES ---
          FAILURE to follow these rules will result in a crash.
          1.  **YOUR ENTIRE RESPONSE MUST BE RAW CODE.** Do NOT write "Here is the code..." or any explanations. Your response MUST start with \`function LessonComponent() {\`.
          2.  **NEVER WRITE MALFORMED EVENT HANDLERS.**
              -   WRONG: \`<input ... > { setMyState(...) }\`
              -   WRONG: \`<input ... > setMyState(...)\`
              -   **RIGHT:** \`<input ... onChange={(e) => setMyState(e.target.value)} />\`
          3.  **NEVER WRITE MALFORMED TERNARIES.**
              -   WRONG: \`className={ condition ? 'class-a' > {text}\`
              -   **RIGHT:** \`className={condition ? 'class-a' : 'class-b'}\`
          4.  **NEVER WRITE UNCLOSED TEMPLATE LITERALS.**
              -   WRONG: \`className={\`w-full ...\`
              -   **RIGHT:** \`className={\`w-full ...\`} \`
          5.  **NEVER LEAVE STRAY TEXT.** Do not write any text outside of valid JSX tags.

          --- COMPONENT REQUIREMENTS ---
          1.  **FILENAME:** \`function LessonComponent()\`
          2.  **INTERACTIVITY:** Use React hooks (useState, etc.) to make the lesson interactive.
          3.  **STYLING:** Use Tailwind CSS for a modern, aesthetic, and responsive design.
          4.  **NO IMPORTS:** Do not include any \`import\` statements.
        `;

        // shorten for readability
        const userPrompt = `
            Generate a complete, responsive and full interactive TypeScript React component that visually teaches this lesson:

            "${outline}"

            ⚙️ Requirements:
            - Use Tailwind CSS utility classes only (no inline styles).
            - The component should be fully self-contained, wrapped in a <div className="p-8 bg-slate-50 min-h-screen font-sans">.
            - For math or step-based lessons, use properly aligned <table> or <div className="grid"> layouts.
            - Avoid absolute positioning unless necessary.
            - Use clear spacing (gap-4, p-4, text-center, etc.).
            - The output must include structured headings, explanatory text, and step-by-step sections.
            - Never render overlapping elements.
            - Prefer <div> or <pre> for math layout with monospace font.

            Guidelines:
            - Use **React hooks** (useState, useEffect) to make it interactive.
            - Visualize concepts dynamically (SVG, sliders, or animations if relevant).
            - Avoid static text-only explanations — always include visual or user-driven elements.
            - Keep it responsive and elegant using Tailwind CSS.
            - Do not import external libraries beyond React and Tailwind.
            - Export the final component as a single function named 'LessonComponent'.
            - Avoid absolute positioning unless necessary; prefer flex or grid layout.
            - If relevant (like math, geometry, or grids), show coordinate planes, points, or charts.
            - Keep explanations concise and visually guided (use cards, dividers, or progress steps).

            Return only the full and valid TypeScript React code.
        `;


        const fullPrompt = `${systemPrompt}\n\nUser Request:\n${userPrompt}`;

        const client = new OpenAI({
            baseURL: "https://models.github.ai/inference",
            apiKey: githubToken,
        });

        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.9,
            model: "openai/gpt-4.1"
        });

        // 👇 Log the full response once for debugging (you can remove later)
        console.log("GitHub raw response:", JSON.stringify(response, null, 2));

        // Safer extraction (Gemini 2.5 returns text in many shapes)
        let generatedCode =
            response?.choices?.[0]?.message?.content ||
            response?.choices?.[0]?.message?.function_call?.arguments ||
            response?.choices?.[0]?.message?.function_call?.name ||
            (response as any)?.output || // some models use this
            (response as any)?.response || // fallback
            '';

        // If still empty, try to extract a nested value
        if (!generatedCode && (response?.choices?.[0]?.message as any)?.parts) {
            for (const part of (response.choices[0].message as any).parts) {
                if (part.text) generatedCode = part.text;
                else if (part.data) generatedCode = JSON.stringify(part.data);
                else if (typeof part === 'string') generatedCode = part;
            }
        }

        if (!generatedCode) {
            console.warn("Empty Gemini response - retrying with flash model");
            const backup = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: fullPrompt }] }],
                        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
                    }),
                }
            );
            const backupData = await backup.json();
            generatedCode =
                backupData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        }


        generatedCode = generatedCode?.trim() ?? '';

        if (!generatedCode) {
            throw new Error('Gemini returned empty response');
        }

        // Clean up any code fences
        // This regex finds the *first* code fence (2 or 3 backticks, any lang),
        // captures all content non-greedily, and stops at the *last* closing fence.
        // This handles cases where Gemini might add "Here's the code:" text.
        const codeMatch = generatedCode.match(/`{2,3}.*?\n([\s\S]*?)\n?`{2,3}/);

        if (codeMatch && codeMatch[1]) {
            // Found a proper code block, extract the middle.
            generatedCode = codeMatch[1];
        } else {
            // No match, or malformed.
            // Aggressively strip the first and last lines if they look like fences.
            // This will catch your exact error: "``typescript jsx..."
            generatedCode = generatedCode
                .replace(/^`{2,3}.*?(\r\n|\n)?/, '') // Remove first line (fence)
                .replace(/(\r\n|\n)?`{2,3}$/, '');   // Remove last line (fence)
        }

        generatedCode = generatedCode.trim();

        // Remove import/export lines if Gemini adds them accidentally
        generatedCode = generatedCode
            .replace(/^import .*$/gm, '')         // remove any import lines

        // Remove import/export lines if Gemini adds them accidentally
        generatedCode = generatedCode
            .replace(/^import .*$/gm, '')         // remove any import lines
            .replace(/^export default /gm, '')    // remove export default
            .replace(/^export /gm, '')            // remove any other export keywords
            .trim();

        let formattedCode = generatedCode;
        try {
            // Ask Prettier to fix all syntax errors it can
            formattedCode = await prettier.format(generatedCode, {
                parser: "typescript", // Use the TypeScript parser
                plugins: ["typescript"], // Ensure the TS plugin is loaded
                semi: true,          // Force semicolons
                trailingComma: "es5",  // Add trailing commas
                singleQuote: true,     // Use single quotes
            });
        } catch (formatError: any) {
            console.warn("Prettier formatting failed, saving raw code:", formatError.message);
        }

        const { error: updateError } = await supabase
            .from('lessons')
            .update({
                status: 'generated',
                typescript_code: formattedCode,
                updated_at: new Date().toISOString(),
            })
            .eq('id', lessonId);

        if (updateError) throw new Error(updateError.message);

        return NextResponse.json(
            { success: true, lessonId, message: 'Lesson generated successfully' },
            { headers: corsHeaders }
        );
    } catch (err) {
        console.error('Error in /api/generate-lesson:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Try to write error status to DB if we have lessonId in request body
        try {
            const body = await req.json().catch(() => ({}));
            const lessonId = (body as any).lessonId;
            if (lessonId) {
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
            }
        } catch (dbErr) {
            console.error('Failed to update lesson error status:', dbErr);
        }

        return NextResponse.json({ success: false, error: errorMessage }, { status: 500, headers: corsHeaders });
    }
}
