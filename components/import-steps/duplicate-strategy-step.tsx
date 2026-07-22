import React from 'react';
import { AlertCircle } from 'lucide-react';
import { DuplicateStrategy, ModuleConfig } from '@/lib/import-export/types';

interface DuplicateStrategyStepProps {
  config: ModuleConfig;
  selectedStrategy: DuplicateStrategy;
  onStrategyChange: (strategy: DuplicateStrategy) => void;
}

export function DuplicateStrategyStep({
  config,
  selectedStrategy,
  onStrategyChange,
}: DuplicateStrategyStepProps) {
  const strategies: Array<{
    value: DuplicateStrategy;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      value: 'insert_new_only',
      label: 'Insert New Only',
      description: 'Skip any records that already exist in the system',
      icon: '➕',
    },
    {
      value: 'overwrite',
      label: 'Overwrite Existing',
      description: 'Replace entire records with imported data',
      icon: '🔄',
    },
    {
      value: 'update',
      label: 'Update Existing',
      description: 'Only update fields that have values in the import file',
      icon: '✏️',
    },
    {
      value: 'skip',
      label: 'Skip Duplicates',
      description: 'Skip duplicate records during import',
      icon: '⏭️',
    },
  ];

  const availableStrategies = strategies.filter((s) => {
    if (s.value === 'overwrite' || s.value === 'update') {
      return config.supportsUpdate;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Step 4: Duplicate Strategy</h3>
        <p className="text-sm text-muted-foreground">
          Choose how to handle records that already exist in the system
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-900">
          Duplicates are detected by: <strong>{config.duplicateCheckFields.join(', ')}</strong>
        </p>
      </div>

      {/* Strategy Options */}
      <div className="space-y-2">
        {availableStrategies.map((strategy) => (
          <button
            key={strategy.value}
            onClick={() => onStrategyChange(strategy.value)}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              selectedStrategy === strategy.value
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:border-primary/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{strategy.icon}</span>
              <div>
                <p className="font-semibold">{strategy.label}</p>
                <p className="text-sm text-muted-foreground">{strategy.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Details based on selection */}
      <div className="p-4 bg-muted rounded-lg space-y-2">
        <p className="font-semibold text-sm">
          {selectedStrategy === 'insert_new_only' && 'Only New Records'}
          {selectedStrategy === 'overwrite' && 'Complete Replacement'}
          {selectedStrategy === 'update' && 'Partial Update'}
          {selectedStrategy === 'skip' && 'Skip Duplicates'}
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          {selectedStrategy === 'insert_new_only' && (
            <>
              <li>Existing records will not be modified</li>
              <li>New records will be created</li>
              <li>Safest option for data integrity</li>
            </>
          )}
          {selectedStrategy === 'overwrite' && (
            <>
              <li>All fields of existing records will be replaced</li>
              <li>Fields not in import will be set to null or default</li>
              <li>Use with caution - existing data will be lost</li>
            </>
          )}
          {selectedStrategy === 'update' && (
            <>
              <li>Only fields with values in the import file will be updated</li>
              <li>Empty fields will not affect existing data</li>
              <li>Preserves data not included in the import</li>
            </>
          )}
          {selectedStrategy === 'skip' && (
            <>
              <li>Duplicate records will be skipped</li>
              <li>New records will be created</li>
              <li>Safe option - preserves existing records</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
