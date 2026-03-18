import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/hooks/useSupabaseData';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, CheckSquare, Users, Clock, FileText,
  Heart, Settings, Menu, Building2, LogOut, BarChart3, Sparkles
} from 'lucide-react';

const allNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare, module: 'tasks' },
  { path: '/crm', label: 'CRM', icon: Users, module: 'crm' },
  { path: '/attendance', label: 'Attendance', icon: Clock, module: 'attendance' },
  { path: '/forms', label: 'Forms', icon: FileText, module: 'forms' },
  { path: '/engagement', label: 'Engagement', icon: Heart, module: 'engagement' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, module: 'analytics' },
  { path: '/reports', label: 'AI Reports', icon: Sparkles, module: 'reports' },
  { path: '/settings', label: 'Settings', icon: Settings, module: 'settings' },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { data: business } = useBusiness();
  const modules = business?.modules || [];

  const navItems = allNavItems.filter(
    (item) => item.module === 'dashboard' || item.module === 'settings' || modules.includes(item.module)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{business?.name || 'Sucoon Se'}</h2>
            <p className="text-xs text-muted-foreground truncate">{business?.owner_name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
            {(profile?.full_name || '?')[0].toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground truncate flex-1">{profile?.full_name}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={signOut} title="Sign out">
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">Sucoon Se Business v2.0</p>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-60 flex-col bg-card border-r border-border fixed inset-y-0 left-0 z-30" style={{ boxShadow: 'var(--shadow-sidebar)' }}>
        <NavContent />
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card border-b border-border flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <NavContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold">Sucoon Se Business</span>
      </header>

      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="pt-14 md:pt-0">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
