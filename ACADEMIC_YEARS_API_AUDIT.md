# Academic Years API Audit Report

## Error Location

**Component:** `components/grades/assessment-selector.tsx`  
**Error Message:** "Failed to fetch academic years"  
**Line Number:** 57 (in catch block)

## Frontend API Call Details

**File:** `/vercel/share/v0-project/components/grades/assessment-selector.tsx`  
**Lines:** 53-63

```typescript
const fetchAcademicYears = async () => {
  try {
    setLoading(true);
    onError(null);
    const response = await fetch('/api/school/academic-years');  // LINE 56
    if (!response.ok) throw new Error('Failed to fetch academic years');
    const data = await response.json();
    setAcademicYears(data.data || []);
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Failed to fetch academic years');
  } finally {
    setLoading(false);
  }
};
```

### Frontend Request Details:
- **URL:** `/api/school/academic-years`
- **HTTP Method:** GET
- **Headers:** None explicitly set (uses default fetch() behavior with browser credentials)
- **Query Parameters:** None
- **Expected Response Shape:**
  ```typescript
  {
    data: Array<{
      id: string;
      name: string;
      year: number;
    }>
  }
  ```

## Backend Route Analysis

**File:** `/vercel/share/v0-project/app/api/school/academic-years/route.ts`  
**Handler:** `GET` method

### Backend Route Details:
- **Path:** `/api/school/academic-years`
- **HTTP Method:** GET (exported as `export async function GET(request: NextRequest)`)
- **Headers Expected:** 
  - Requires authentication (calls `getSchoolIdFromRequest`)
  - Validates school access via `validateSchoolIdAccess`
- **Query Parameters:** None required
- **Response Shape on Success (200):**
  ```typescript
  {
    data: Array<{
      id: string;
      name: string;
      year: number;
      start_date: string;
      end_date: string;
      is_active: boolean;
    }>
  }
  ```
- **Response Shape on Error (400/403/500):**
  ```typescript
  {
    error: string;
  }
  ```

## Path Matching Verification

| Aspect | Frontend | Backend | Match |
|--------|----------|---------|-------|
| URL Path | `/api/school/academic-years` | `/api/school/academic-years` | ✓ YES |
| HTTP Method | GET | GET | ✓ YES |
| Response Key | `data.data` | Returns `{ data: [...] }` | ✓ YES |
| Response Field Order | `id, name, year` | `id, name, year, start_date, end_date, is_active` | ✓ YES (extra fields ok) |

## Root Cause Analysis

**The route exists and the paths match perfectly.** The "Failed to fetch academic years" error is occurring for one of these reasons:

1. **Authentication Failure (Most Likely):**
   - `getSchoolIdFromRequest()` is failing to extract the school ID from the request
   - `validateSchoolIdAccess()` is rejecting the user's school access
   - User session/authentication token is not being included in the fetch request

2. **Network/CORS Issue:**
   - Browser CORS policy blocking the request
   - Network timeout or 5xx server error

3. **Server Configuration Issue:**
   - Route not being served by the deployed application
   - Authentication middleware intercepting before route handler

## Diagnosis Process

When the error occurs, the browser console would show one of:

```
GET /api/school/academic-years 401
GET /api/school/academic-years 403
GET /api/school/academic-years 500
```

The actual HTTP status code will indicate which validation failed.

## Expected Behavior if Working

1. User loads `/app/(school)/grades/page.tsx`
2. Component mounts and triggers `fetchAcademicYears()`
3. Fetch request includes authentication credentials
4. Backend validates school access
5. Backend queries `academic_years` table filtered by `school_id`
6. Backend returns array of academic years sorted by year descending
7. Frontend displays academic years in dropdown

## Recommended Next Steps

1. Check browser Network tab for actual HTTP status code when "Failed to fetch academic years" appears
2. Check browser Console for any error details
3. Verify Supabase session is active
4. Verify user is authenticated before loading grades page
5. Check Vercel logs for server-side error messages from `getSchoolIdFromRequest()` or `validateSchoolIdAccess()`

## Summary

- ✓ Frontend endpoint path is correct
- ✓ Backend route exists and exports GET handler
- ✓ Response shape matches expectations
- ✓ All database fields are included
- ✗ **Likely Issue:** Authentication/Authorization failure (not endpoint mismatch)
