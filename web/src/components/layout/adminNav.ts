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
  Landmark,
  Sparkle,
  Globe,
  GalleryHorizontal,
  Play,
  UsersRound,
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
    label: 'Mobile Configuration',
    items: [{ label: 'Home Banners', icon: Image, href: paths.admin.homeBanners }],
  },
  /*
   * Website Configuration — the public Plan B website (`site/`), kept in its own
   * group beside Mobile Configuration rather than folded into it. They configure
   * two different clients: a Home banner is the app's 64:27 carousel, a hero
   * slide is the website's 4:3 banner with two buttons, and putting them in one
   * group invites the assumption that editing one changes both.
   */
  {
    label: 'Website Configuration',
    items: [
      {
        label: 'Website',
        icon: Globe,
        children: [
          { label: 'Hero Slider', icon: GalleryHorizontal, href: paths.admin.heroSlides },
          { label: 'About Video', icon: Play, href: paths.admin.websiteAbout },
          { label: 'The Team', icon: UsersRound, href: paths.admin.websiteTeam },
        ],
      },
    ],
  },
  {
    items: [
      {
        label: 'Settings',
        icon: Settings,
        children: [
          { label: 'Bank Details', icon: Landmark, href: paths.admin.settingsBankDetails },
          { label: 'App Intro', icon: Sparkle, href: paths.admin.settingsAppIntro },
        ],
      },
    ],
  },
];
