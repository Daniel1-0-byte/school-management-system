import React, { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { FileFormat } from '@/lib/import-export/types';

interface FileUploadStepProps {
  onFileSelect: (file: File) => void;
  onFormatChange: (format: FileFormat) => void;
  selectedFile: File | null;
  selectedFormat: FileFormat;
  isLoading: boolean;
  error?: string;
}

export function FileUploadStep({
  onFileSelect,
  onFormatChange,
  selectedFile,
  selectedFormat,
  isLoading,
  error,
}: FileUploadStepProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Step 1: Select Import File</h3>
        <p className="text-sm text-muted-foreground">
          Choose a CSV, Excel, or ODS file with your data
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          {(['csv', 'xlsx', 'xls', 'ods'] as FileFormat[]).map((format) => (
            <button
              key={format}
              onClick={() => onFormatChange(format)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedFormat === format
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/20 hover:border-primary/50'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="font-semibold mb-1">Drag and drop your file here</p>
          <p className="text-sm text-muted-foreground mb-4">or</p>

          <label className="inline-block">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.ods"
              onChange={handleInputChange}
              disabled={isLoading}
              className="hidden"
            />
            <span className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Processing...' : 'Browse Files'}
            </span>
          </label>
        </div>

        {selectedFile && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
