import {
  LayoutDashboard,
  Users,
  BookOpen,
  ShoppingCart,
  ListChecks,
  Briefcase,
  Factory,
  FolderTree,
  IdCard,
  Star,
  Sparkles,
  ClipboardCheck,
  Bell,
  Wallet,
  BarChart3,
  Settings,
  Image,
  type LucideIcon,
} from 'lucide-react';
import { paths } from '@/routes/paths';

export interface AdminNavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  comingSoon?: boolean;
  /** Sub-items rendered as an expandable group under this item (e.g. Jobs > Industries). */
  children?: AdminNavItem[];
}

export interface AdminNavGroup {
  label?: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: paths.admin.dashboard },
      { label: 'Students', icon: Users, href: paths.admin.students },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        label: 'Courses',
        icon: BookOpen,
        children: [
          { label: 'All Courses', icon: BookOpen, href: paths.admin.courses },
          { label: 'Categories', icon: FolderTree, href: paths.admin.courseCategories },
        ],
      },
      { label: 'Services', icon: Sparkles, href: paths.admin.services },
      { label: 'Checklists', icon: ListChecks, href: paths.admin.checklists },
      {
        label: 'Jobs',
        icon: Briefcase,
        children: [
          { label: 'Job Posts', icon: Briefcase, comingSoon: true },
          { label: 'Industries', icon: Factory, href: paths.admin.industries },
          { label: 'Professions', icon: IdCard, href: paths.admin.professions },
        ],
      },
      { label: 'Success Stories', icon: Star, comingSoon: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Orders & Payments', icon: ShoppingCart, href: paths.admin.orders },
      { label: 'Service Purchases', icon: ClipboardCheck, href: paths.admin.servicePurchases },
      { label: 'Notifications', icon: Bell, comingSoon: true },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Accounts', icon: Wallet, comingSoon: true },
      { label: 'Reports', icon: BarChart3, comingSoon: true },
    ],
  },
  {
    items: [
      {
        label: 'Settings',
        icon: Settings,
        children: [{ label: 'Home Banner', icon: Image, href: paths.admin.homeBanner }],
      },
    ],
  },
];
