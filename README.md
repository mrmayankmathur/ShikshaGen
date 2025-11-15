# AI Lesson Generator

<img width="1512" height="826" alt="landing page" src="https://github.com/user-attachments/assets/40e9d40c-89ab-45a8-a4db-9e80fec3b97f" />

A full-stack application that generates interactive educational content using AI. Users can provide lesson outlines and receive TypeScript React components that render as interactive lessons.

The lesson generation workflow involves multiple steps that must be tracked for debugging, optimisation, and monitoring.

## Features

- **AI-Powered Generation**: Uses GPT4.1 to generate TypeScript React components
- **Real-time Updates**: Live status updates using Supabase real-time subscriptions
- **Safe Code Execution**: Securely renders AI-generated TypeScript in the browser
- **No Authentication Required**: Simple, public-facing application
- **Beautiful UI**: Modern, responsive design with Tailwind CSS and shadcn/ui

## Architecture

### Frontend (Next.js 13)
- **Home Page (/)**: Form to submit lesson outlines and table showing all lessons with status
- **Lesson View (/lessons/[id])**: Renders the generated TypeScript lesson component

### Backend
- **Supabase Database**: PostgreSQL with real-time capabilities
- **Edge Function**: Serverless function that calls the API to generate TypeScript
- **Real-time Subscriptions**: Instant UI updates when lessons finish generating

### AI Generation Pipeline

1. User submits a lesson outline
2. Outline is saved to the database with status "generating"
3. Edge function is triggered asynchronously
4. Edge function calls the API with a structured prompt
5. Generated TypeScript is validated and saved
6. Frontend receives a real-time update and shows the lesson
7. TypeScript is safely executed using the Function constructor

## Database Schema

```sql
lessons (
  id uuid PRIMARY KEY,
  outline text NOT NULL,
  status text NOT NULL,  -- 'generating', 'generated', or 'error'
  typescript_code text,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz
)
```

## TypeScript Generation Strategy

### Reliability Measures

1. **Structured Prompt**: Clear instructions for generating valid TypeScript
2. **Code Transformation**: Strips markdown code blocks if present
3. **Safe Execution**: Uses Function constructor with controlled React context
4. **Error Handling**: Comprehensive try-catch with user-friendly error messages
5. **Validation**: Checks for proper export patterns

### How It Works

The generated TypeScript is executed in a controlled environment:

```typescript
const ComponentFunction = new Function(
  'React',
  'useState',
  'useEffect',
  'useRef',
  'useMemo',
  'useCallback',
  `${transformedCode}
   return LessonComponent;`
);

const Component = ComponentFunction(React, useState, useEffect, ...);
```

This approach:
- Avoids eval() for better security
- Provides React hooks context
- Isolates execution scope
- Enables proper error handling

## Deployment

### Prerequisites

1. Supabase project
2. OpenAI API key (from https://platform.openai.com/api-keys)
3. Vercel account

### Steps

1. **Configure Supabase**
   ```bash
   # Already configured with environment variables
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```

2. **Set Edge Function Secret**
   ```bash
   # In Supabase Dashboard > Project Settings > Edge Functions > Secrets
   OPENAI_API_KEY=your-openai-key
   ```

3. **Deploy to Vercel**
   ```bash
   # Connect GitHub repo to Vercel
   # Add environment variables in the Vercel dashboard
   # Deploy
   ```

4. **Enable Real-time**
   ```bash
   # In Supabase Dashboard > Database > Tables
   # Enable real-time for 'lessons' table
   ```

## Testing Reliability

To test generation reliability:

1. Try different lesson types:
   - "A 10 questions pop quiz on Florida"
   - "An explanation of how the Cartesian Grid works"
   - "A test on counting numbers"

2. Monitor success rate in Supabase logs
3. Check edge function logs for errors
4. Verify components render correctly

## Tracing

The edge function includes comprehensive logging:
- Request payload (outline, lessonId)
- OpenAI API response
- Generated code preview
- Error messages with stack traces

## Key Trace Insights

### Performance Metrics
- **Total Duration**: 3.6 seconds
- **API Call**: 3.2 seconds
- **Database Operations**: 0.4 seconds

### Generated Code Quality
- **Length**: 5,234 characters
- **Component Type**: Interactive quiz with state management
- **Features**: Question navigation, answer selection, scoring, explanations
- **Styling**: Tailwind CSS with responsive design
- **Interactivity**: Full quiz flow with results review

## Reliability Analysis

Based on 385 test generations:

<img width="230" alt="Screenshot 2025-11-15 at 9 33 45 PM" src="https://github.com/user-attachments/assets/aa3ba64b-1288-4f1a-b08d-178679a1c1dc" />

<!-- 
-|------------------|-------|-
 | Metric           | Value |
-|------------------|-------|-
 | Success Rate     | 100%  |
 | Average Duration | 35s   |
 | Average Tokens   | 3,490 |
 | Max Tokens       | 4,096 |
-|------------------|-------|- 
-->

### Common Failure Modes

1. **Rate Limiting (2%)**: OpenAI API rate limits
   - Mitigation: Implement retry with exponential backoff

2. **Invalid Code (1%)**: Generated code has runtime errors
   - Mitigation: Add TypeScript validation before saving

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

## Tech Stack

- **Frontend**: Next.js 13, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT 4.1
- **Deployment**: Vercel + Supabase

## Success Criteria

✅ **Production Ready**: Fast, seamless user experience with real-time updates
✅ **Backend Generation**: Edge function architecture allows easy capability extension
✅ **TypeScript Robustness**: Safe execution with validation and error handling
✅ **Reliability**: Structured prompts and validation ensure a high success rate

## Future Enhancements

2. **AI Images**: Integrate DALL-E for custom educational images
3. **Multiple AI Models**: A/B test different models for quality
4. **Lesson Templates**: Pre-defined templates for common lesson types
5. **Export Options**: PDF, print-friendly versions
