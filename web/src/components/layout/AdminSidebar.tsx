import { useState } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminNavGroups, type AdminNavItem } from '@/components/layout/adminNav';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '@/hooks/useAuth';
import { initials } from '@/lib/formatters';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/logo.png" alt="Plan B International" className="size-10 rounded-full object-cover" />
        <div className="leading-tight">
          <p className="font-semibold text-white">Plan B</p>
          <p className="text-xs text-sidebar-muted">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {adminNavGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {group.label && (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <NavItem key={item.label} item={item} currentPath={location.pathname} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      {/* Pinned to the bottom of the sidebar viewport — sits outside the
          scrollable nav above, so it stays put while nav items scroll. */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">{initials(user?.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium text-white">{user?.name}</p>
                <p className="truncate text-xs text-sidebar-muted">{user?.email}</p>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              {user?.roles?.[0] && (
                <p className="mt-1 text-xs font-normal text-accent-foreground">{user.roles[0]}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon /> My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => logout.mutate()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function NavItem({
  item,
  currentPath,
  onNavigate,
}: {
  item: AdminNavItem;
  currentPath: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (item.children) {
    return (
      <NavGroupItem
        icon={Icon}
        label={item.label}
        items={item.children}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
    );
  }

  if (item.comingSoon || !item.href) {
    return (
      <div className="flex cursor-not-allowed items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted/70">
        <span className="flex items-center gap-3">
          <Icon className="size-4" />
          {item.label}
        </span>
        <span className="rounded-full border border-sidebar-border px-1.5 py-0.5 text-[10px]">Soon</span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.href}
      end={item.href === '/admin'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="size-4" />
      {item.label}
    </NavLink>
  );
}

function NavGroupItem({
  icon: Icon,
  label,
  items,
  currentPath,
  onNavigate,
}: {
  icon: AdminNavItem['icon'];
  label: string;
  items: AdminNavItem[];
  currentPath: string;
  onNavigate?: () => void;
}) {
  const hasActiveChild = items.some((child) => !!child.href && currentPath.startsWith(child.href));
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      >
        <span className="flex items-center gap-3">
          <Icon className="size-4" />
          {label}
        </span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-1 ml-4 space-y-1 border-l border-sidebar-border pl-3">
          {items.map((child) => (
            <NavItem key={child.label} item={child} currentPath={currentPath} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}
