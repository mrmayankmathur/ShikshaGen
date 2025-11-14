'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface LessonRendererProps {
  code: string;
}

export function LessonRenderer({ code }: LessonRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (!code) return;

    (async () => {
      try {
        // ✅ Dynamically import Babel only in the browser
        const Babel = await import('@babel/standalone');

        const cleanedCode = cleanGeneratedCode(code);

        // ✅ Add filename for clearer error context
        const transpiled = Babel.transform(cleanedCode, {
          filename: 'lesson.tsx',
          presets: ['typescript', 'react'],
        }).code;

        const finalCode = transformCodeForExecution(transpiled || '');

        const ComponentFunction = new Function(
          'React',
          `
            try {
              ${finalCode}
              return LessonComponent || (() => React.createElement('div', {}, 'No component exported'));
            } catch (err) {
              console.error('Error executing generated component:', err);
              return () => React.createElement('div', {}, 'Component execution failed');
            }
          `
        );

        const GeneratedComponent = ComponentFunction(React);
        setComponent(() => GeneratedComponent);
        setError(null);
      } catch (err) {
        if (err instanceof SyntaxError && code.includes('className={`')) {
          const repairedCode = code.replace(/className=\{\`([^}]*)>\{/g, 'className={`$1`}>{');
          console.warn('Auto-repaired JSX syntax and retrying...');
          try {
            const Babel = await import('@babel/standalone');
            const transpiled = Babel.transform(repairedCode, {
              filename: 'lesson.tsx',
              presets: ['typescript', 'react'],
            }).code;
            const finalCode = transformCodeForExecution(transpiled || '');
            const ComponentFunction = new Function('React', `${finalCode}; return LessonComponent;`);
            const GeneratedComponent = ComponentFunction(React);
            setComponent(() => GeneratedComponent);
            setError(null);
            return;
          } catch (retryError) {
            console.error('Retry after auto-fix failed:', retryError);
          }
        }

        console.error('Error rendering component:', err);
        setError(err instanceof Error ? err.message : 'Failed to render component');
      }
    })();
  }, [code]);

  // 🧹 Removes AI-generated syntax quirks and invalid JSX
  function cleanGeneratedCode(code: string): string {
    return code
      // 👇 --- NEW AGGRESSIVE HANDLER STRIPPER --- 👇
      // The AI is terrible at event handlers. Remove them all.
      // This looks for ` onClick={...}` and removes it,
      // even if the AI forgot the closing brace.
      .replace(/\s+on[A-Z]\w+\s*=\s*\{[\s\S]*?(\}\s*|(?=>))/g, '')
      // --------------------------------------------------

      // --- Remove stray CSS units after template literals ---
      .replace(/`}\s*(rem|px|vh|ms|em|%)`/g, '`}')
      // --- Fix unclosed template literals like `className={`...}>{` ---
      .replace(/className=\{\`([^}]*)>\{/g, 'className={`$1`}>{')
      // --- Fix missing closing backticks before JSX text ---
      .replace(/className=\{\`([^`]*)\}/g, (m, p1) => `className={\`${p1.trim()}\``)
      // --- Ensure closing backtick exists before } if missing ---
      .replace(/className=\{\`([^`]*)\}/g, 'className={`$1`}')
      // --- Remove broken inline styles or leftover tokens ---
      .replace(/style=\{[^}]+\}/g, '')
      // --- Strip absolute positioning artifacts ---
      .replace(/position:\s*absolute/g, '')
      .replace(/top:\s*\d+/g, '')
      .replace(/left:\s*\d+/g, '')
      // --- Clean duplicate braces ---
      .replace(/\}\s*\}/g, '}')
      // --- Remove dangling or double backticks ---
      .replace(/``/g, '`')
      .replace(/`(?=\s*[)};])/g, '')

      // --- Removes stray style fragments like `...className="foo" % } />` ---
      .replace(/("|'|`)\s+[^>]*?\s*\}\s*(\/?>)/g, '$1 $2')
      
      // --- Sanitize common math/Unicode symbols that crash Babel ---
      .replace(/²/g, '^2') // Replaces superscript 2
      .replace(/³/g, '^3') // Replaces superscript 3
      .replace(/−/g, '-') // Replaces Unicode minus with ASCII hyphen
      .replace(/×/g, '*') // Replaces multiplication X with asterisk
      .replace(/÷/g, '/') // Replaces division symbol with slash

      // --- Fix malformed quotes ---
      .replace(/“|”/g, '"')
      .replace(/‘|’/g, "'")
      // --- Remove trailing template fragments ---
      .replace(/\${[^}]*$/g, '')
      .trim();
  }

  // 🎯 Ensures we always have a valid React component to render
  function transformCodeForExecution(originalCode: string): string {
    let transformed = originalCode;

    // Replace default exports
    transformed = transformed.replace(/export\s+default\s+function\s+(\w+)/, 'function LessonComponent');
    transformed = transformed.replace(/export\s+default\s+(\w+)/, 'const LessonComponent = $1');

    // If no explicit export, find any function and rename it
    if (!transformed.includes('LessonComponent')) {
      const fnMatch = transformed.match(/function\s+(\w+)\s*\(/);
      if (fnMatch) {
        transformed = transformed.replace(fnMatch[0], 'function LessonComponent(');
      }
    }

    return transformed;
  }

  // 🧯 Error display card
  if (error) {
    return (
      <Card className="p-8 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Rendering Error</h3>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  // ✅ Render the generated component safely
if (Component) {
  const SafeComponent = Component as React.ElementType;
  return (
    <Card className="overflow-hidden shadow-lg">
      <div className="bg-white">
        <SafeComponent />
      </div>
    </Card>
  );
}

// 🧩 Fallback: show code as text if rendering fails
if (!Component && code) {
  return (
    <Card className="p-8 whitespace-pre-wrap bg-slate-50 overflow-auto">
      <h3 className="font-bold text-slate-800 mb-2">Lesson Source</h3>
      <pre className="text-sm text-slate-700">{code}</pre>
    </Card>
  );
}

return (
  <Card className="p-8 text-center">
    <p className="text-slate-600">Preparing lesson...</p>
  </Card>
);
}
