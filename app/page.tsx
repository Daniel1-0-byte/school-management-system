import Link from 'next/link';
import { ArrowRight, BookOpen, Users, BarChart3, MessageSquare, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            SchoolHub
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-6 py-2 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              Sign Up Your School
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col justify-center">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
            School Management Made{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Simple
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Comprehensive school management software for attendance, fees, academics, and seamless communication between teachers, students, and parents.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/50 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-slate-900/50 border-y border-slate-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Core Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Management */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">School Management</h3>
              <p className="text-slate-400">
                Manage students, teachers, classes, and academic years. Organize your entire school structure efficiently.
              </p>
            </div>

            {/* Academics */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <BookOpen className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Academic System</h3>
              <p className="text-slate-400">
                Track grades, generate report cards, and manage academic performance across terms and subjects.
              </p>
            </div>

            {/* Fees & Financials */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Fee Management</h3>
              <p className="text-slate-400">
                Track student fees, generate invoices, and monitor payment status with detailed financial reports.
              </p>
            </div>

            {/* Attendance */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                <CheckCircle className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Attendance Tracking</h3>
              <p className="text-slate-400">
                Record daily attendance, view patterns, and generate attendance reports for parents and admins.
              </p>
            </div>

            {/* Communication */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Communication Hub</h3>
              <p className="text-slate-400">
                Send notices, announcements, and updates to teachers, students, and parents instantly.
              </p>
            </div>

            {/* Smart Class */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                <BookOpen className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">SmartClass LMS</h3>
              <p className="text-slate-400">
                Integrated learning management system for online lessons, assignments, and class resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Why Choose SchoolHub?</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                'Secure & scalable cloud infrastructure',
                'Real-time data synchronization',
                'Mobile-friendly interface for all users',
                'Comprehensive audit logging',
                'Dedicated support for your school',
                'Affordable pricing for all school sizes',
              ].map((benefit, index) => (
                <div key={index} className="flex gap-4">
                  <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300">{benefit}</p>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-8 border border-blue-500/20">
              <p className="text-lg text-slate-300 leading-relaxed">
                SchoolHub is trusted by over 100 schools across the region to manage their daily operations efficiently. Our platform handles everything from attendance and grades to fees and parent communication.
              </p>
              <p className="text-lg text-slate-300 leading-relaxed mt-4">
                Join our growing community and transform your school management experience today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-y border-slate-800 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-4xl font-bold text-white">Ready to Transform Your School?</h2>
          <p className="text-xl text-slate-300">
            Get started with a free account and discover how SchoolHub can streamline your school management.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
          >
            Sign Up Your School <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-4">SchoolHub</h3>
              <p className="text-slate-400 text-sm">
                Modern school management software for the digital age.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 SchoolHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
