import React from 'react';
import { Eye, ChevronRight } from 'lucide-react';
import { ValidationResult } from '@/lib/import-export/types';

interface PreviewStepProps {
  validationResult: ValidationResult;
  config: any;
}

export function PreviewStep({ validationResult, config }: PreviewStepProps) {
  const totalRows = validationResult.rowsToCreate.length + validationResult.rowsToUpdate.length;
  const headers = config.columns.map((col: any) => col.csvHeader);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Step 3: Import Preview</h3>
        <p className="text-sm text-muted-foreground">
          Review a sample of the data that will be imported
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-muted-foreground mb-1">To Create</p>
          <p className="text-2xl font-bold text-blue-600">{validationResult.rowsToCreate.length}</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-muted-foreground mb-1">To Update</p>
          <p className="text-2xl font-bold text-amber-600">{validationResult.rowsToUpdate.length}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-muted-foreground mb-1">Total Valid</p>
          <p className="text-2xl font-bold text-green-600">{totalRows}</p>
        </div>
      </div>

      {/* Data Preview */}
      {totalRows > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Sample Data Preview
          </h4>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted border-b">
                  <th className="px-3 py-2 text-left font-semibold w-12">Type</th>
                  {headers.map((header: string) => (
                    <th key={header} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Show up to 3 create rows */}
                {validationResult.rowsToCreate.slice(0, 3).map((row, idx) => (
                  <tr key={`create-${idx}`} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 font-semibold text-green-600">+</td>
                    {headers.map((header: string) => (
                      <td key={`${idx}-${header}`} className="px-3 py-2 truncate max-w-xs">
                        {row[header] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Show up to 2 update rows */}
                {validationResult.rowsToUpdate.slice(0, 2).map((row, idx) => (
                  <tr key={`update-${idx}`} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 font-semibold text-amber-600">~</td>
                    {headers.map((header: string) => (
                      <td key={`${idx}-${header}`} className="px-3 py-2 truncate max-w-xs">
                        {row[header] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalRows > 5 && (
            <p className="text-xs text-muted-foreground">
              Showing {Math.min(5, totalRows)} of {totalRows} rows
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-6 h-6 flex items-center justify-center bg-green-50 text-green-600 rounded text-xs font-bold">
            +
          </span>
          <span className="text-muted-foreground">New record to be created</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-6 h-6 flex items-center justify-center bg-amber-50 text-amber-600 rounded text-xs font-bold">
            ~
          </span>
          <span className="text-muted-foreground">Existing record to be updated</span>
        </div>
      </div>
    </div>
  );
}
