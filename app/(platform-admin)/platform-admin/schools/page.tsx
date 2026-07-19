import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { Plus, Search, MoreVertical } from 'lucide-react';

async function getSchools() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return [];
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, address, phone_number, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[v0] Failed to fetch schools:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching schools:', error);
    return [];
  }
}

export default async function SchoolsPage() {
  const schools = await getSchools();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Schools</h1>
          <p className="text-muted-foreground mt-2">Manage all schools in the system</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          <Plus className="w-5 h-5" />
          <span>Add School</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search schools..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {schools.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No schools found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    School Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school: any) => (
                  <tr key={school.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{school.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{school.address}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{school.phone_number}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(school.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
