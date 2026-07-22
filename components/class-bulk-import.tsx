'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import { ClassTransformer, type Class } from '@/lib/transformers/class-transformer';

interface ClassBulkImportProps {
  schoolId: string;
  onSuccess?: (count: number) => void;
  onClose?: () => void;
}

export function ClassBulkImport({ schoolId, onSuccess, onClose }: ClassBulkImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<Partial<Class>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: Array<{ row: number; error: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      setError(null);
      setFile(selectedFile);

      const text = await selectedFile.text();
      const classes = parseFile(text, selectedFile.name);
      setPreviewData(classes.slice(0, 5));
      setPreviewing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setFile(null);
    }
  };

  const parseFile = (content: string, filename: string): Partial<Class>[] => {
    if (filename.endsWith('.csv')) {
      return parseCSV(content);
    } else if (filename.endsWith('.json')) {
      return parseJSON(content);
    } else {
      throw new Error('Unsupported file format. Please use CSV or JSON.');
    }
  };

  const parseCSV = (content: string): Partial<Class>[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV file must have headers and at least one row');

    const headers = lines[0].split(',').map((h) => h.trim());
    const classes: Partial<Class>[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;

      const record: Record<string, any> = {};
      headers.forEach((header, index) => {
        record[header] = values[index]?.trim() || undefined;
      });

      classes.push(mapRecordToClass(record));
    }

    return classes;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  };

  const parseJSON = (content: string): Partial<Class>[] => {
    try {
      const data = JSON.parse(content);
      if (!Array.isArray(data)) throw new Error('JSON must be an array');
      return data.map(mapRecordToClass);
    } catch (err) {
      throw new Error('Invalid JSON format');
    }
  };

  const mapRecordToClass = (record: Record<string, any>): Partial<Class> => {
    return {
      className: record.class_name || record.className,
      gradeLevel: record.grade_level || record.gradeLevel,
      section: record.section,
      classTeacherId: record.class_teacher_id || record.classTeacherId,
      capacity: record.capacity ? parseInt(record.capacity) : record.capacity,
      academicYearId: record.academic_year_id || record.academicYearId,
      status: record.status || 'active',
    };
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setImporting(true);
      setError(null);

      const text = await file.text();
      const classes = parseFile(text, file.name);

      const importResult = await SchoolService.bulkCreateClasses(schoolId, classes);
      if (importResult.error) throw new Error(importResult.error);

      setResult(importResult);
      onSuccess?.(importResult.created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewing(false);
    setPreviewData([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${result.errors.length === 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
          <div className="flex gap-3">
            {result.errors.length === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${result.errors.length === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                Import Complete
              </p>
              <p className={`text-sm ${result.errors.length === 0 ? 'text-green-600/80' : 'text-yellow-600/80'}`}>
                {result.created} classes imported successfully
                {result.errors.length > 0 && ` • ${result.errors.length} errors`}
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Errors:</p>
              {result.errors.slice(0, 5).map((err, i) => (
                <p key={i} className="text-sm text-red-600">
                  Row {err.row}: {err.error}
                </p>
              ))}
              {result.errors.length > 5 && (
                <p className="text-sm text-muted-foreground">+ {result.errors.length - 5} more errors</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Import Another
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (previewing && previewData.length > 0) {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Preview ({previewData.length} of {previewData.length} rows)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Class Name</th>
                  <th className="text-left py-2 px-3 font-medium">Grade</th>
                  <th className="text-left py-2 px-3 font-medium">Section</th>
                  <th className="text-left py-2 px-3 font-medium">Capacity</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((c, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3">{c.className}</td>
                    <td className="py-2 px-3">{c.gradeLevel}</td>
                    <td className="py-2 px-3">{c.section}</td>
                    <td className="py-2 px-3">{c.capacity || '-'}</td>
                    <td className="py-2 px-3">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Import {previewData.length} Classes</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="font-medium">Drop CSV or JSON file here</p>
        <p className="text-sm text-muted-foreground">or click to select</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {file && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="flex-1 text-sm font-medium truncate">{file.name}</span>
          <button
            onClick={handleReset}
            className="p-1 hover:bg-background rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Expected columns: class_name, grade_level, section, capacity, class_teacher_id, academic_year_id, status
      </p>
    </div>
  );
}
