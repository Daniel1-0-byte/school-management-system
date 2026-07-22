# Runtime Error Fix: supportsBulkOps TypeError

## Issue
```
TypeError: Cannot read properties of undefined (reading 'supportsBulkOps')
```

## Root Cause Analysis

### 1. Configuration Object Undefined
- The `ImportExportToolbar` component expected a `config: ModuleConfig` prop
- Pages were passing individual props instead of the complete `ModuleConfig`
- When config was undefined, accessing `config.supportsBulkOps` threw TypeError

### 2. Module Registry Incomplete
- Only 4 modules had configurations (students, teachers, classes, subjects)
- Staff pages referenced "staff" module but only "teachers" was configured
- No module naming normalization

### 3. No Defensive Guards
- Toolbar had no null checks before accessing `config` properties
- No graceful degradation for missing configurations
- Development-time errors leaked into runtime

## Solution Implemented

### 1. Made Config Prop Optional (types.ts pattern)
```typescript
interface ImportExportToolbarProps {
  config?: ModuleConfig;  // Now optional
  // ...other props...
}
```

### 2. Added Configuration Fetching (import-export-toolbar.tsx)
```typescript
const [config, setConfig] = useState<ModuleConfig | null>(propConfig || null);
const [configError, setConfigError] = useState<string | null>(null);

useEffect(() => {
  if (propConfig) {
    setConfig(propConfig);
    return;
  }
  const fetchedConfig = getModuleConfig(moduleName);
  if (fetchedConfig) {
    setConfig(fetchedConfig);
  }
}, [moduleName, propConfig]);
```

### 3. Added Module Aliases (column-definitions.ts)
```typescript
export const COLUMN_DEFINITIONS = {
  ...moduleConfigs,
  staff: moduleConfigs.teachers,  // staff ↔ teachers mapping
};
```

### 4. Added Defensive Checks
```typescript
const availableBulkOps = config?.supportsBulkOps || [];

// Show error in dev mode if config is missing
if (!config && process.env.NODE_ENV === 'development') {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 border border-yellow-500/30 
                    bg-yellow-500/10 rounded-lg text-yellow-700 text-xs font-medium">
      <AlertCircle className="w-4 h-4" />
      No config for {moduleName}
    </div>
  );
}

// Gracefully disable in production if no config found
if (!config) {
  return null;
}
```

### 5. Updated Students Page Integration (students/page.tsx)
```typescript
import { getModuleConfig } from '@/lib/import-export/column-definitions';

// Pass config explicitly
<ImportExportToolbar
  schoolId={schoolId || ''}
  moduleName="students"
  config={getModuleConfig('students') || undefined}
  selectedRows={Array.from(selectedStudents)}
  onImportSuccess={fetchStudents}
  onBulkActionComplete={fetchStudents}
  hasFilters={!!search || status !== 'active'}
/>
```

## Changes Summary

| File | Change | Lines |
|------|--------|-------|
| `lib/import-export/types.ts` | Made `config` optional in toolbar props | 1 |
| `lib/import-export/column-definitions.ts` | Added module aliases + normalized lookup | 8 |
| `components/import-export-toolbar.tsx` | Added config fetching, null checks, graceful degradation | 54 |
| `app/(school)/students/page.tsx` | Updated toolbar usage with correct config | 9 |

## Verification Results

✅ Build Status: SUCCESS (0 errors, 0 warnings)
✅ Browser Test: App loads without errors
✅ Console: No TypeError, no undefined warnings
✅ Graceful Degradation: Missing configs show warnings in dev, disabled in production
✅ Module Registry: 5 modules now supported (students, teachers, classes, subjects, staff)

## Security & Integrity

✅ No auth/RLS/middleware changes
✅ No session management modifications
✅ School isolation preserved
✅ Backward compatible with existing code
✅ Zero user-facing disruption

## Future Prevention

1. All modules must be registered in `column-definitions.ts`
2. New modules need entries in `moduleConfigs` before use
3. Defensive guards on all config access (using optional chaining)
4. Development warnings for missing configurations
5. Production graceful degradation for missing configs

