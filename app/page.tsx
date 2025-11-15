'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, type Lesson } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  showLessonCreatedNotification, 
  showLessonGeneratedNotification, 
  showLessonErrorNotification,
  showLessonGeneratingNotification 
} from '@/components/notifications';
import { Loader2, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from "react-hot-toast";

export default function Home() {
  const [outline, setOutline] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const timeoutWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutFailRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
  fetchLessons();

  const channel = supabase
    .channel('lessons-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lessons',
      },
      (payload) => {
        console.log('Realtime update received:', payload);
        
        if (payload.eventType === 'INSERT') {
          setLessons((prev) => [payload.new as Lesson, ...prev]);
          showLessonCreatedNotification();
          
        } else if (payload.eventType === 'UPDATE') {
          const updatedLesson = payload.new as Lesson;
          
          setLessons((prev) =>
            prev.map((lesson) =>
              lesson.id === updatedLesson.id ? updatedLesson : lesson
            )
          );

          if (updatedLesson.status === 'generated') {
            setIsGenerating(false);
            showLessonGeneratedNotification();
            if (timeoutWarningRef.current) clearTimeout(timeoutWarningRef.current);
            if (timeoutFailRef.current) clearTimeout(timeoutFailRef.current);
            
          } else if (updatedLesson.status === 'error') {
            setIsGenerating(false);
            showLessonErrorNotification(updatedLesson.error_message ?? undefined);
            if (timeoutWarningRef.current) clearTimeout(timeoutWarningRef.current);
            if (timeoutFailRef.current) clearTimeout(timeoutFailRef.current);
            
          } else if (updatedLesson.status === 'generating') {
            showLessonGeneratingNotification();
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  async function fetchLessons() {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lessons:', error);
    } else {
      setLessons(data || []);
    }
  }

  async function handleGenerate() {
    if (!outline.trim()) return;

    setIsGenerating(true);
    toast.dismiss();

    try {
      // Create a new "generating" lesson
      const { data: lesson, error: insertError } = await supabase
        .from("lessons")
        .insert({
          outline: outline.trim(),
          status: "generating",
        })
        .select()
        .single();

      if (insertError || !lesson) {
        throw insertError || new Error("Lesson creation failed");
      }
      
      const lessonId = lesson.id;

      // Set up timeout warnings
      timeoutWarningRef.current = setTimeout(() => {
        toast("⏳ This is taking longer than expected. The query might be large or the model is under heavy load.", {
          icon: "💡",
          duration: 6000,
        });
      }, 60_000); // 1 minute warning

      timeoutFailRef.current = setTimeout(async () => {
        toast.error("⚠️ The generation took too long and was stopped.");
        setIsGenerating(false);

        await supabase
          .from("lessons")
          .update({
            status: "error",
            error_message: "Generation timed out after 2 minutes.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", lessonId);
      }, 120_000); // 2 minute fail-safe

      // Call the API (Realtime will handle the update)
      const controller = new AbortController();
      const abortTimeout = setTimeout(() => controller.abort(), 125_000);

      fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, outline: outline.trim() }),
        signal: controller.signal,
      })
        .then(async (res) => {
          clearTimeout(abortTimeout);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `Server returned ${res.status}`);
          }
        })
        .catch(async (error) => {
          console.error("Generation error:", error);
          
          // Clear timeouts
          if (timeoutWarningRef.current) clearTimeout(timeoutWarningRef.current);
          if (timeoutFailRef.current) clearTimeout(timeoutFailRef.current);
          
          setIsGenerating(false);
          toast.error("⚠️ Lesson generation failed.");
          
          await supabase
            .from("lessons")
            .update({
              status: "error",
              error_message: error.message || "Failed to generate lesson",
              updated_at: new Date().toISOString(),
            })
            .eq("id", lessonId);
        });

      setOutline("");
      
    } catch (error: any) {
      console.error("Error starting generation:", error);
      setIsGenerating(false);
      toast.error("⚠️ Could not start lesson generation.");
      
      // Clear timeouts
      if (timeoutWarningRef.current) clearTimeout(timeoutWarningRef.current);
      if (timeoutFailRef.current) clearTimeout(timeoutFailRef.current);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'generating':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating
          </Badge>
        );
      case 'generated':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Generated
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Toaster position="bottom-right" />
      
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            ShikshaGen - Lesson Generator
          </h1>
          <p className="text-slate-600 text-lg">
            Generate interactive educational content within seconds using AI
          </p>
        </div>

        <Card className="mb-8 shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Create New Lesson
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your lesson outline here... (e.g., 'A 10 question pop quiz on Florida' or 'An explanation of how the Cartesian Grid works')"
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={isGenerating}
              />
              <Button
                onClick={handleGenerate}
                disabled={!outline.trim() || isGenerating}
                className="w-full sm:w-auto"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Lesson'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>Your Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No lessons yet. Create your first lesson above!</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lesson Outline</TableHead>
                      <TableHead className="w-[150px]">Status</TableHead>
                      <TableHead className="w-[150px]">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessons.map((lesson) => (
                      <TableRow
                        key={lesson.id}
                        className={lesson.status === 'generated' ? 'cursor-pointer hover:bg-slate-50' : ''}
                        onClick={() => {
                          if (lesson.status === 'generated') {
                            router.push(`/lessons/${lesson.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-medium">
                          {lesson.outline}
                        </TableCell>
                        <TableCell>{getStatusBadge(lesson.status)}</TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(lesson.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
