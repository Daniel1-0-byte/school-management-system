'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle, Loader2, Users } from 'lucide-react';
import { PaginatedResponse } from '@/types';

interface Class {
  id: string;
  name: string;
  section: string;
  teacherName: string;
  studentCount: number;
  roomNumber: string;
  capacity: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    section: '',
    teacherId: '',
    roomNumber: '',
    capacity: '50',
  });

  useEffect(() => {
    const getSchoolId = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSchoolId(data.session?.schoolId || null);
        }
      } catch (err) {
        console.error('[v0] Failed to get school ID:', err);
      }
    };
    getSchoolId();
  }, []);

  const fetchClasses = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        school_id: schoolId,
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/school/classes?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch classes');

      const data: PaginatedResponse<Class> = await response.json();
      setClasses(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [schoolId, page, pageSize, search]);

  const handleAddClass = async () => {
    try {
      const response = await fetch('/api/school/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to add class');

      setFormData({ name: '', section: '', teacherId: '', roomNumber: '', capacity: '50' });
      setShowAddForm(false);
      setPage(1);
      setTimeout(() => fetchClasses(), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add class');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      const response = await fetch(`/api/school/classes/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete class');
      await fetchClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Classes</h1>
          <p className="text-muted-foreground mt-1">Manage school classes and sections</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          <span>Add Class</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Add Class Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Add New Class</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Class Name (e.g., 10-A)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Section"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Room Number"
              value={formData.roomNumber}
              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
            <input
              type="number"
              placeholder="Capacity"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddClass}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Add Class
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No classes found</p>
          </div>
        ) : (
          classes.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{classItem.name}</h3>
                  <p className="text-sm text-muted-foreground">Section: {classItem.section}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(classItem.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Room</span>
                  <span className="font-medium text-foreground">{classItem.roomNumber}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Students</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {classItem.studentCount} / {classItem.capacity}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Class Teacher</span>
                  <span className="font-medium text-foreground">{classItem.teacherName || 'N/A'}</span>
                </div>
              </div>

              <div className="mt-4 w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(classItem.studentCount / classItem.capacity) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} classes
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= total}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
