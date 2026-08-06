'use client';

import React, { useState, useRef } from 'react';
import { Upload, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { uploadImage, deleteImage, getImagePreview } from '@/lib/storage-utils';

interface LogoUploadProps {
  currentLogoUrl: string | null;
  schoolId: string;
  onUploadSuccess: (url: string) => void;
}

export function LogoUpload({ currentLogoUrl, schoolId, onUploadSuccess }: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      setError(null);
      setSuccess(false);

      // Get preview
      const previewUrl = await getImagePreview(file);
      setPreview(previewUrl);

      // Upload to storage
      setIsUploading(true);
      const { url, error: uploadError } = await uploadImage(
        'school-logos',
        file,
        `${schoolId}/logo-${Date.now()}.${file.name.split('.').pop()}`
      );

      if (uploadError) {
        setError(uploadError);
        return;
      }

      if (url) {
        onUploadSuccess(url);
        setSuccess(true);
        setPreview(null);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">School Logo</label>
        <p className="text-xs text-muted-foreground mb-4">JPEG, PNG, GIF, or WebP • Maximum 5MB</p>
      </div>

      {/* Logo Preview */}
      {currentLogoUrl && (
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center">
              <img
                src={currentLogoUrl}
                alt="School logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Current Logo</p>
            <p className="text-xs text-muted-foreground mt-1">This logo will appear on all report cards</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleInputChange}
          disabled={isUploading}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Drag and drop or click to upload</p>
            <p className="text-xs text-muted-foreground">New logo will replace the current one</p>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>
          <div className="w-full max-w-xs mx-auto bg-muted rounded p-3 flex items-center justify-center min-h-20">
            <img src={preview} alt="Logo preview" className="max-w-full max-h-20 object-contain" />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex gap-2">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-600">Logo uploaded successfully</p>
        </div>
      )}
    </div>
  );
}
