'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Archive, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Dialog } from './dialog';
import { ConfirmationDialog } from './confirmation-dialog';

interface Term {
  id: string;
  academic_year_id: string;
  type: string;
  start_date: string;
  end_date: string;
  report_card_deadline: string | null;
}

interface AcademicYear {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  terms_count: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  onYearCreated?: () => void;
}

export function AcademicYearsManagement({ onYearCreated }: Props) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [expandedYearId, setExpandedYearId] = useState<string | null>(null);
  const [terms, setTerms] = useState<Record<string, Term[]>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AcademicYear | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    is_active: false,
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/school/academic-years');
      if (!response.ok) throw new Error('Failed to fetch academic years');
      const data = await response.json();
      setAcademicYears(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch academic years');
    } finally {
      setLoading(false);
    }
  };

  const fetchTermsForYear = async (yearId: string) => {
    try {
      const response = await fetch(`/api/school/terms?academic_year_id=${yearId}`);
      if (!response.ok) throw new Error('Failed to fetch terms');
      const data = await response.json();
      setTerms(prev => ({ ...prev, [yearId]: data.data || [] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch terms');
    }
  };

  const handleExpandYear = (yearId: string) => {
    if (expandedYearId === yearId) {
      setExpandedYearId(null);
    } else {
      setExpandedYearId(yearId);
      if (!terms[yearId]) {
        fetchTermsForYear(yearId);
      }
    }
  };

  const handleCreateOrUpdateYear = async () => {
    try {
      if (!formData.year || !formData.start_date || !formData.end_date) {
        setError('Please fill in all required fields');
        return;
      }

      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        setError('End date must be after start date');
        return;
      }

      let response;
      if (editingYear) {
        response = await fetch(`/api/school/academic-years/${editingYear.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        response = await fetch('/api/school/academic-years', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save academic year');
      }

      setSuccessMessage(editingYear ? 'Academic year updated' : 'Academic year created');
      setIsDialogOpen(false);
      setEditingYear(null);
      setFormData({
        year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        is_active: false,
      });
      fetchAcademicYears();
      onYearCreated?.();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save academic year');
    }
  };

  const handleEditYear = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      year: year.year,
      start_date: year.start_date,
      end_date: year.end_date,
      is_active: year.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteYear = async () => {
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/school/academic-years/${confirmDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete academic year');
      }

      setSuccessMessage('Academic year deleted');
      setConfirmDelete(null);
      fetchAcademicYears();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete academic year');
    }
  };

  const handleSetActive = async (year: AcademicYear) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/school/academic-years/${year.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });

      if (!response.ok) throw new Error('Failed to set active year');
      setSuccessMessage('Academic year activated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAcademicYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate year');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Header with New Year Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Academic Years</h2>
        <button
          onClick={() => {
            setEditingYear(null);
            setFormData({
              year: new Date().getFullYear(),
              start_date: '',
              end_date: '',
              is_active: false,
            });
            setIsDialogOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Academic Year
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Loading academic years...</p>
        </div>
      )}

      {/* Academic Years Table */}
      {!loading && academicYears.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Year</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Start Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">End Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Terms</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {academicYears.map((year) => (
                <React.Fragment key={year.id}>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground font-medium">{year.year}-{year.year + 1}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(year.start_date)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(year.end_date)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{year.terms_count || 0} terms</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          year.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {year.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleExpandYear(year.id)}
                          className="p-2 hover:bg-muted rounded transition-colors"
                          title="View terms"
                        >
                          {expandedYearId === year.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditYear(year)}
                          className="p-2 hover:bg-muted rounded transition-colors text-blue-600"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!year.is_active && (
                          <button
                            onClick={() => handleSetActive(year)}
                            className="p-2 hover:bg-muted rounded transition-colors text-green-600"
                            title="Set active"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(year)}
                          className="p-2 hover:bg-muted rounded transition-colors text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Terms Expandable Row */}
                  {expandedYearId === year.id && (
                    <tr className="border-b border-border bg-muted/20">
                      <td colSpan={6} className="px-6 py-4">
                        <TermsSection yearId={year.id} year={year} terms={terms[year.id] || []} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && academicYears.length === 0 && (
        <div className="border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No academic years yet. Create one to get started.</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingYear(null);
        }}
        title={editingYear ? 'Edit Academic Year' : 'New Academic Year'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Academic Year
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {!editingYear && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-foreground">Make this year active</span>
            </label>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <button
              onClick={() => {
                setIsDialogOpen(false);
                setEditingYear(null);
              }}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateOrUpdateYear}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              {editingYear ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDelete !== null}
        title="Delete Academic Year"
        message={`Are you sure you want to delete ${confirmDelete?.year}? This will also delete all associated terms.`}
        isDangerous
        onConfirm={handleDeleteYear}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function TermsSection({
  yearId,
  year,
  terms,
}: {
  yearId: string;
  year: AcademicYear;
  terms: Term[];
}) {
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [termData, setTermData] = useState({
    type: 'term_1',
    start_date: '',
    end_date: '',
    report_card_deadline: '',
  });
  const [termError, setTermError] = useState<string | null>(null);
  const [savingTerm, setSavingTerm] = useState(false);

  const handleAddTerm = async () => {
    try {
      if (!termData.type || !termData.start_date || !termData.end_date) {
        setTermError('Please fill in required fields');
        return;
      }

      setSavingTerm(true);
      const response = await fetch('/api/school/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academic_year_id: yearId,
          ...termData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create term');
      }

      setIsAddingTerm(false);
      setTermData({
        type: 'term_1',
        start_date: '',
        end_date: '',
        report_card_deadline: '',
      });
      setTermError(null);

      // Refetch terms
      const termsResponse = await fetch(`/api/school/terms?academic_year_id=${yearId}`);
      if (termsResponse.ok) {
        const data = await termsResponse.json();
        // Update parent component (simplified)
      }
    } catch (err) {
      setTermError(err instanceof Error ? err.message : 'Failed to create term');
    } finally {
      setSavingTerm(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-foreground">Terms for {year.year}</h3>
        <button
          onClick={() => setIsAddingTerm(true)}
          className="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          Add Term
        </button>
      </div>

      {terms.length > 0 && (
        <div className="space-y-2">
          {terms.map((term) => (
            <div
              key={term.id}
              className="bg-white border border-border rounded p-3 flex justify-between items-start"
            >
              <div className="flex-1">
                <p className="font-medium text-foreground">{term.type.replace('_', ' ').toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(term.start_date)} to {formatDate(term.end_date)}
                </p>
                {term.report_card_deadline && (
                  <p className="text-xs text-muted-foreground">
                    Report card deadline: {formatDate(term.report_card_deadline)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button className="p-1 hover:bg-muted rounded text-blue-600" title="Edit">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button className="p-1 hover:bg-muted rounded text-red-600" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddingTerm && (
        <div className="bg-white border border-border rounded p-3 space-y-3">
          {termError && <p className="text-sm text-red-600">{termError}</p>}
          <input
            type="text"
            placeholder="Term type (e.g., term_1)"
            value={termData.type}
            onChange={(e) => setTermData({ ...termData, type: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="date"
            value={termData.start_date}
            onChange={(e) => setTermData({ ...termData, start_date: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="date"
            value={termData.end_date}
            onChange={(e) => setTermData({ ...termData, end_date: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="date"
            placeholder="Report card deadline"
            value={termData.report_card_deadline}
            onChange={(e) => setTermData({ ...termData, report_card_deadline: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddingTerm(false)}
              className="flex-1 px-3 py-2 border border-border rounded text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTerm}
              disabled={savingTerm}
              className="flex-1 px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {savingTerm ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
