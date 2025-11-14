'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, type Lesson } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { LessonRenderer } from '@/components/lesson-renderer';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;

    fetchLesson();

    const channel = supabase
      .channel(`lesson-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lessons',
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          setLesson(payload.new as Lesson);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  async function fetchLesson() {
    try {
      const { data, error: fetchError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', params.id)
        .single();

      if (fetchError) throw fetchError;

      setLesson(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-slate-600" />
          <p className="text-slate-600">Loading lesson...</p>
        </Card>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-bold mb-2">Error Loading Lesson</h2>
          <p className="text-slate-600 mb-4">{error || 'Lesson not found'}</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  if (lesson.status === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-slate-600" />
          <h2 className="text-xl font-bold mb-2">Generating Your Lesson</h2>
          <p className="text-slate-600 mb-4">
            Please wait while we create your educational content...
          </p>
          <p className="text-sm text-slate-500">{lesson.outline}</p>
        </Card>
      </div>
    );
  }

  if (lesson.status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-bold mb-2">Generation Failed</h2>
          <p className="text-slate-600 mb-4">
            {lesson.error_message || 'An error occurred while generating the lesson'}
          </p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lessons
          </Button>
        </div>

        <div className="mb-6 text-center">
          <p className="text-sm text-slate-500 mb-2">Lesson Outline</p>
          <h1 className="text-2xl font-bold text-slate-900">{lesson.outline}</h1>
        </div>

        <LessonRenderer code={lesson.typescript_code || ''} />
      </div>
    </div>
  );
}
