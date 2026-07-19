'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight, Upload } from 'lucide-react';

type SetupStep = 'school-details' | 'academic-year' | 'curriculum' | 'invite-teacher' | 'complete';

interface SchoolDetailsData {
  name: string;
  address: string;
  principalName: string;
  principalEmail: string;
  phone: string;
  website?: string;
  logoFile?: File;
}

interface AcademicYearData {
  year: number;
  startDate: string;
  endDate: string;
}

interface TermData {
  term1Start: string;
  term1End: string;
  term2Start: string;
  term2End: string;
  term3Start: string;
  term3End: string;
}

interface TeacherInviteData {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
}

export default function SetupWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<SetupStep>('school-details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [schoolDetails, setSchoolDetails] = useState<SchoolDetailsData>({
    name: '',
    address: '',
    principalName: '',
    principalEmail: '',
    phone: '',
    website: '',
  });

  const [academicYear, setAcademicYear] = useState<AcademicYearData>({
    year: new Date().getFullYear(),
    startDate: `${new Date().getFullYear()}-01-15`,
    endDate: `${new Date().getFullYear() + 1}-12-15`,
  });

  const [terms, setTerms] = useState<TermData>({
    term1Start: `${new Date().getFullYear()}-01-15`,
    term1End: `${new Date().getFullYear()}-04-15`,
    term2Start: `${new Date().getFullYear()}-05-01`,
    term2End: `${new Date().getFullYear()}-08-15`,
    term3Start: `${new Date().getFullYear()}-09-01`,
    term3End: `${new Date().getFullYear()}-12-15`,
  });

  const [teacherInvite, setTeacherInvite] = useState<TeacherInviteData>({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
  });

  const [logoFileName, setLogoFileName] = useState('');

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleSchoolDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSchoolDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSchoolDetails(prev => ({ ...prev, logoFile: file }));
      setLogoFileName(file.name);
    }
  };

  const handleAcademicYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAcademicYear(prev => ({ ...prev, [name]: name === 'year' ? parseInt(value) : value }));
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTerms(prev => ({ ...prev, [name]: value }));
  };

  const handleTeacherInviteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTeacherInvite(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = async () => {
    setError('');

    if (currentStep === 'school-details') {
      if (!schoolDetails.name || !schoolDetails.address || !schoolDetails.principalName) {
        setError('Please fill in all required fields');
        return;
      }
      setCurrentStep('academic-year');
    } else if (currentStep === 'academic-year') {
      if (!academicYear.startDate || !academicYear.endDate) {
        setError('Please select academic year dates');
        return;
      }
      setCurrentStep('curriculum');
    } else if (currentStep === 'curriculum') {
      if (!terms.term1Start || !terms.term1End) {
        setError('Please configure at least Term 1 dates');
        return;
      }
      setCurrentStep('invite-teacher');
    } else if (currentStep === 'invite-teacher') {
      setCurrentStep('complete');
    }
  };

  const handleBack = () => {
    if (currentStep === 'school-details') return;
    
    const steps: SetupStep[] = ['school-details', 'academic-year', 'curriculum', 'invite-teacher', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      // Here you would save the school setup data
      // For now, just redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-2xl mx-auto p-4 py-12">
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {['school-details', 'academic-year', 'curriculum', 'invite-teacher', 'complete'].map((step, index) => (
                  <React.Fragment key={step}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                        step === currentStep
                          ? 'bg-blue-500 text-white'
                          : ['school-details', 'academic-year', 'curriculum', 'invite-teacher', 'complete'].indexOf(step) < ['school-details', 'academic-year', 'curriculum', 'invite-teacher', 'complete'].indexOf(currentStep)
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    {index < 4 && <div className="flex-1 h-1 bg-slate-700" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-sm">Step {['school-details', 'academic-year', 'curriculum', 'invite-teacher', 'complete'].indexOf(currentStep) + 1} of 5</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Step 1: School Details */}
          {currentStep === 'school-details' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">School Information</h2>
                <p className="text-slate-400">Let&apos;s get your school details set up</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">School Name *</label>
                <input
                  type="text"
                  name="name"
                  value={schoolDetails.name}
                  onChange={handleSchoolDetailsChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                  placeholder="Your School Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Address *</label>
                <input
                  type="text"
                  name="address"
                  value={schoolDetails.address}
                  onChange={handleSchoolDetailsChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                  placeholder="School Address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Principal Name *</label>
                  <input
                    type="text"
                    name="principalName"
                    value={schoolDetails.principalName}
                    onChange={handleSchoolDetailsChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                    placeholder="Principal Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Principal Email *</label>
                  <input
                    type="email"
                    name="principalEmail"
                    value={schoolDetails.principalEmail}
                    onChange={handleSchoolDetailsChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                    placeholder="principal@school.edu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={schoolDetails.phone}
                    onChange={handleSchoolDetailsChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={schoolDetails.website}
                    onChange={handleSchoolDetailsChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                    placeholder="https://school.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">School Logo (Optional)</label>
                <label className="block px-4 py-3 rounded-lg bg-slate-700 border border-dashed border-slate-600 cursor-pointer hover:border-blue-500 transition-colors">
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-300 text-sm">
                      {logoFileName || 'Click to upload logo'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Academic Year */}
          {currentStep === 'academic-year' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Academic Year</h2>
                <p className="text-slate-400">Set up your academic year dates</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Academic Year</label>
                <input
                  type="number"
                  name="year"
                  value={academicYear.year}
                  onChange={handleAcademicYearChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={academicYear.startDate}
                    onChange={handleAcademicYearChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={academicYear.endDate}
                    onChange={handleAcademicYearChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Curriculum/Terms */}
          {currentStep === 'curriculum' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">School Terms</h2>
                <p className="text-slate-400">Configure your school terms</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Term 1</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
                      <input
                        type="date"
                        name="term1Start"
                        value={terms.term1Start}
                        onChange={handleTermsChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
                      <input
                        type="date"
                        name="term1End"
                        value={terms.term1End}
                        onChange={handleTermsChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Term 2</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
                      <input
                        type="date"
                        name="term2Start"
                        value={terms.term2Start}
                        onChange={handleTermsChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
                      <input
                        type="date"
                        name="term2End"
                        value={terms.term2End}
                        onChange={handleTermsChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Term 3</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
                      <input
                        type="date"
                        name="term3Start"
                        value={terms.term3Start}
                        onChange={handleTermsChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
                      <input
                        type="date"
                        name="term3End"
                        value={terms.term3End}
                        onChange={handleTermsChange}
                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Invite First Teacher */}
          {currentStep === 'invite-teacher' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Invite First Teacher</h2>
                <p className="text-slate-400">Add your first teacher to get started (Optional)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={teacherInvite.firstName}
                  onChange={handleTeacherInviteChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                  placeholder="Teacher First Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={teacherInvite.lastName}
                  onChange={handleTeacherInviteChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                  placeholder="Teacher Last Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={teacherInvite.email}
                  onChange={handleTeacherInviteChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                  placeholder="teacher@school.edu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Primary Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={teacherInvite.subject}
                  onChange={handleTeacherInviteChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                  placeholder="e.g., Mathematics, English"
                />
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
                <p className="text-slate-400">
                  Your school is ready to go. Click below to access your dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-6">
            {currentStep !== 'school-details' && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Back
              </button>
            )}
            {currentStep !== 'complete' ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
