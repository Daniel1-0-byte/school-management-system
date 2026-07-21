'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Search, AlertCircle, Loader2, FileText, Mail, MapPin, Building } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { PaginatedResponse } from '@/types';

interface SchoolRequest {
  id: string;
  schoolName: string;
  contactPerson: string;
  email: string;
  phone: string;
  location?: string;
  requestedPlan: string;
  status: 'pending' | 'approved' | 'rejected' | 'provisioned';
  notes?: string;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export default function SchoolRequestsPage() {
  const [requests, setRequests] = useState<SchoolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SchoolRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Fetch requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        status,
        ...(search && { search }),
      });

      const response = await fetch(
        `/api/platform-admin/school-requests?${params.toString()}`,
        { 
          headers: { 'Accept': 'application/json' },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch school requests');
      }

      const data: PaginatedResponse<SchoolRequest> = await response.json();
      setRequests(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, pageSize, status, search]);

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      const response = await fetch('/api/platform-admin/school-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId,
          action: 'approve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      setPage(1);
      setTimeout(() => fetchRequests(), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectReason) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setProcessingId(requestId);
      const response = await fetch('/api/platform-admin/school-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId,
          action: 'reject',
          rejectionReason: rejectReason,
          rejectionNotes: rejectNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      setShowRejectModal(false);
      setRejectReason('');
      setRejectNotes('');
      setSelectedRequest(null);
      setPage(1);
      setTimeout(() => fetchRequests(), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadgeColor = (requestStatus: string) => {
    switch (requestStatus) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-600';
      case 'approved':
        return 'bg-green-500/20 text-green-600';
      case 'rejected':
        return 'bg-red-500/20 text-red-600';
      case 'provisioned':
        return 'bg-blue-500/20 text-blue-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic':
        return 'bg-blue-500/10 text-blue-600';
      case 'standard':
        return 'bg-purple-500/10 text-purple-600';
      case 'premium':
        return 'bg-gold-500/10 text-gold-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">School Requests</h1>
        <p className="text-muted-foreground mt-2">Review and approve new school registration requests</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by school name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="provisioned">Provisioned</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <Building className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No school requests found</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-card border border-border rounded-lg p-6 hover:border-border/80 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{request.schoolName}</h3>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{request.contactPerson}</p>
                </div>
                <span className={`inline-flex px-3 py-1 rounded text-xs font-semibold ${getPlanColor(request.requestedPlan)}`}>
                  {request.requestedPlan.charAt(0).toUpperCase() + request.requestedPlan.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 py-4 border-y border-border/50">
                <div className="flex gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground">{request.email}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">{request.phone}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">{request.location || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {request.notes && (
                <div className="mb-4 p-3 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                  <p className="text-sm text-foreground">{request.notes}</p>
                </div>
              )}

              {request.rejectionReason && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
                  <p className="text-xs text-red-600 font-semibold mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-600">{request.rejectionReason}</p>
                  {request.rejectionReason && (
                    <p className="text-xs text-red-600/70 mt-2">{request.rejectionReason}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(request.submittedAt)}
                </p>

                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-600 hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectModal(true);
                      }}
                      disabled={processingId === request.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-600 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
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

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Reject Request: {selectedRequest.schoolName}
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Rejection Reason *
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="">Select a reason</option>
                  <option value="Incomplete Information">Incomplete Information</option>
                  <option value="Unable to Verify">Unable to Verify</option>
                  <option value="Policy Violation">Policy Violation</option>
                  <option value="Duplicate Request">Duplicate Request</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Add any additional information..."
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setRejectNotes('');
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedRequest.id)}
                disabled={processingId === selectedRequest.id || !rejectReason}
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-600 hover:bg-red-500/30 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {processingId === selectedRequest.id ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                ) : null}
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
