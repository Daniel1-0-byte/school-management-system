'use client';

import React, { useState, useRef } from 'react';
import { Upload, Loader2, AlertCircle, Check, Trash2 } from 'lucide-react';
import { getImagePreview } from '@/lib/storage-utils';

interface SignatureUploadProps {
  currentSignatureUrl: string | null;
  onUploadSuccess: (url: string) => void;
  onDeleteSuccess: () => void;
}

export function SignatureUpload({
  currentSignatureUrl,
  onUploadSuccess,
  onDeleteSuccess,
}: SignatureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      setError(null);
      setSuccess(false);

      // Get preview
      const previewUrl = await getImagePreview(file);
      setPreview(previewUrl);

      // Upload through the authenticated server route so Storage authorization
      // uses the app session and the service-role client, not an anonymous browser client.
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const saveResponse = await fetch('/api/school/settings/signature', {
        method: 'POST',
        body: formData,
      });
      const saveResult = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveResult.error || 'Failed to upload signature');
      }

      if (saveResult.signature_url) {
        onUploadSuccess(saveResult.signature_url);
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

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      // Call API to delete signature from profile
      const response = await fetch('/api/school/settings/signature', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete signature');
      }

      onDeleteSuccess();
      setShowDeleteConfirm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
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
        <label className="block text-sm font-medium text-foreground mb-2">Principal Signature</label>
        <p className="text-xs text-muted-foreground mb-4">Clear signature image • JPEG, PNG, GIF, or WebP • Maximum 5MB</p>
      </div>

      {/* Signature Preview */}
      {currentSignatureUrl && (
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-40 h-16 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center p-2">
              <img
                src={currentSignatureUrl}
                alt="Principal signature"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Current Signature</p>
              <p className="text-xs text-muted-foreground mt-1">This will appear on all report cards</p>
            </div>
            {!showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-destructive hover:underline font-medium mt-2"
              >
                Remove signature
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && currentSignatureUrl && (
        <div className="border border-destructive/30 bg-destructive/10 rounded-lg p-3 space-y-3">
          <p className="text-sm text-destructive font-medium">Are you sure you want to delete the signature?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!currentSignatureUrl || !showDeleteConfirm ? (
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
              <p className="text-xs text-muted-foreground">
                {currentSignatureUrl ? 'New signature will replace the current one' : 'Upload your signature image'}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Preview */}
      {preview && (
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>
          <div className="w-full max-w-xs mx-auto bg-muted rounded p-3 flex items-center justify-center min-h-20">
            <img src={preview} alt="Signature preview" className="max-w-full max-h-20 object-contain" />
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
          <p className="text-xs text-green-600">
            {isDeleting ? 'Signature deleted successfully' : 'Signature uploaded successfully'}
          </p>
        </div>
      )}
    </div>
  );
}
