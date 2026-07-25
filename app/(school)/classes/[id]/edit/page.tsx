'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StreamForm } from '@/components/stream-form';

export default function EditStreamPage() {
  const router = useRouter();
  const params = useParams();
  // Ensure params.id is a string and not undefined
  const streamId = (params.id as string) || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Stream</h1>
          <p className="text-muted-foreground mt-1">Update stream information</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl">
        {streamId ? (
          <StreamForm
            streamId={streamId}
            onSuccess={() => {
              router.push('/classes');
            }}
          />
        ) : (
          <p className="text-muted-foreground">Loading...</p>
        )}
      </div>
    </div>
  );
}
