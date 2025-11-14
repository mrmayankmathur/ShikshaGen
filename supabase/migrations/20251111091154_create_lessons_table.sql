/*
  # Create lessons table

  1. New Tables
    - `lessons`
      - `id` (uuid, primary key)
      - `outline` (text) - The lesson outline provided by the user
      - `status` (text) - Status: 'generating' or 'generated'
      - `typescript_code` (text) - The generated TypeScript React component code
      - `error_message` (text, nullable) - Error message if generation failed
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      
  2. Security
    - Enable RLS on `lessons` table
    - Add policy for public read access (no auth required)
    - Add policy for public insert access (no auth required)
    - Add policy for public update access (no auth required)
*/

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outline text NOT NULL,
  status text NOT NULL DEFAULT 'generating',
  typescript_code text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lessons"
  ON lessons
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert lessons"
  ON lessons
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update lessons"
  ON lessons
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS lessons_created_at_idx ON lessons(created_at DESC);