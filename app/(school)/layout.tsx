'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Clock,
  BarChart3,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const getNavItems = (role: string): NavItem[] => {
  const baseItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  ];

  if (role === 'Admin') {
    return [
      ...baseItems,
      { label: 'Students', href: '/students', icon: <Users className="w-5 h-5" /> },
      { label: 'Staff', href: '/staff', icon: <Users className="w-5 h-5" /> },
      { label: 'Classes', href: '/classes', icon: <BookOpen className="w-5 h-5" /> },
      { label: 'Attendance', href: '/attendance', icon: <Clock className="w-5 h-5" /> },
      { label: 'Grades', href: '/grades', icon: <BarChart3 className="w-5 h-5" /> },
      { label: 'Reports', href: '/reports', icon: <BarChart3 className="w-5 h-5" /> },
      { label: 'Messages', href: '/messages', icon: <Mail className="w-5 h-5" /> },
      { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
    ];
  } else if (role === 'Teacher') {
    return [
      ...baseItems,
      { label: 'My Classes', href: '/classes', icon: <BookOpen className="w-5 h-5" /> },
      { label: 'Attendance', href: '/attendance', icon: <Clock className="w-5 h-5" /> },
      { label: 'Grades', href: '/grades', icon: <BarChart3 className="w-5 h-5" /> },
      { label: 'Messages', href: '/messages', icon: <Mail className="w-5 h-5" /> },
    ];
  } else if (role === 'Parent') {
    return [
      ...baseItems,
      { label: 'My Child', href: '/my-child', icon: <Users className="w-5 h-5" /> },
      { label: 'Attendance', href: '/child-attendance', icon: <Clock className="w-5 h-5" /> },
      { label: 'Grades', href: '/child-grades', icon: <BarChart3 className="w-5 h-5" /> },
      { label: 'Messages', href: '/messages', icon: <Mail className="w-5 h-5" /> },
    ];
  }

  return baseItems;
};

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('Admin');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication and setup status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[v0][LAYOUT] Checking authentication...');
        const response = await fetch('/api/auth/session');
        
        if (!response.ok) {
          console.log('[v0][LAYOUT] Not authenticated, redirecting to login');
          router.push('/login');
          return;
        }

        const data = await response.json();
        console.log('[v0][LAYOUT] Auth check result:', {
          hasSession: !!data.session,
          setupCompleted: data.session?.setupCompleted,
        });

        if (!data.session) {
          console.log('[v0][LAYOUT] No session found, redirecting to login');
          router.push('/login');
          return;
        }

        setUserRole(data.session.role || 'Admin');
        setIsAuthenticated(true);

        // Check if profile setup is completed
        if (data.session.setupCompleted === false && pathname !== '/setup') {
          console.log('[v0][LAYOUT] Setup not completed, redirecting to setup');
          router.push('/setup');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('[v0][LAYOUT] Auth check error:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, pathname]);
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('[v0] Logout error:', error);
    }
  };

  const navItems = getNavItems(userRole);
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render layout if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:inset-auto`}
      >
        {/* Logo / Brand */}
        <div className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg text-foreground">SchoolHub</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <div key={item.href}>
              <button
                onClick={() => {
                  if (item.children) {
                    setExpandedMenu(expandedMenu === item.href ? null : item.href);
                  } else {
                    router.push(item.href);
                    setIsSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.children && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      expandedMenu === item.href ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {/* Submenu */}
              {item.children && expandedMenu === item.href && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <button
                      key={child.href}
                      onClick={() => {
                        router.push(child.href);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        isActive(child.href)
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              S
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                School Admin
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Administrator
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              admin@school.edu
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}
    </div>
  );
}
