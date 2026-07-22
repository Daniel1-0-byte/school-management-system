'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import { StudentTransformer } from '@/lib/transformers/student-transformer';
import type { Student } from '@/types';

interface StudentBulkImportProps {
  schoolId: string;
  onSuccess?: (count: number) => void;
  onClose?: () => void;
}

export function StudentBulkImport({ schoolId, onSuccess, onClose }: StudentBulkImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<Partial<Student>[]>([]);
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
      const students = parseFile(text, selectedFile.name);
      setPreviewData(students.slice(0, 5)); // Show first 5 rows for preview
      setPreviewing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setFile(null);
    }
  };

  const parseFile = (content: string, filename: string): Partial<Student>[] => {
    if (filename.endsWith('.csv')) {
      return parseCSV(content);
    } else if (filename.endsWith('.json')) {
      return parseJSON(content);
    } else {
      throw new Error('Unsupported file format. Please use CSV or JSON.');
    }
  };

  const parseCSV = (content: string): Partial<Student>[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV file must have headers and at least one row');

    const headers = lines[0].split(',').map((h) => h.trim());
    const students: Partial<Student>[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;

      const student: Record<string, any> = {};
      headers.forEach((header, index) => {
        student[header] = values[index]?.trim() || undefined;
      });

      students.push(mapRecordToStudent(student));
    }

    return students;
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

  const parseJSON = (content: string): Partial<Student>[] => {
    try {
      const data = JSON.parse(content);
      if (!Array.isArray(data)) throw new Error('JSON must be an array');
      return data.map(mapRecordToStudent);
    } catch (err) {
      throw new Error('Invalid JSON format');
    }
  };

  const mapRecordToStudent = (record: Record<string, any>): Partial<Student> => {
    return {
      firstName: record.first_name || record.firstName,
      lastName: record.last_name || record.lastName,
      admissionNumber: record.admission_number || record.admissionNumber,
      dateOfBirth: record.date_of_birth || record.dateOfBirth,
      currentClassId: record.current_class_id || record.currentClassId,
      currentClassName: record.current_class_name || record.currentClassName,
      parentalStatus: record.parental_status || record.parentalStatus,
      medicalNotes: record.medical_notes || record.medicalNotes,
      allergies: record.allergies,
    };
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setImporting(true);
      setError(null);

      const text = await file.text();
      const students = parseFile(text, file.name);

      const importResult = await SchoolService.bulkCreateStudents(schoolId, students);
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
                {result.created} students imported successfully
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
                  <th className="text-left py-2 px-3 font-medium">First Name</th>
                  <th className="text-left py-2 px-3 font-medium">Last Name</th>
                  <th className="text-left py-2 px-3 font-medium">Admission #</th>
                  <th className="text-left py-2 px-3 font-medium">DOB</th>
                  <th className="text-left py-2 px-3 font-medium">Class</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((student, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3">{student.firstName}</td>
                    <td className="py-2 px-3">{student.lastName}</td>
                    <td className="py-2 px-3">{student.admissionNumber}</td>
                    <td className="py-2 px-3">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-'}</td>
                    <td className="py-2 px-3">{student.currentClassName || '-'}</td>
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
                <span>Import {previewData.length} Students</span>
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
        Expected columns: first_name, last_name, admission_number, date_of_birth, current_class_id, current_class_name, parental_status, medical_notes, allergies
      </p>
    </div>
  );
}
