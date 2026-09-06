/*
 * Every Lucide icon the app uses, deep-imported one file at a time.
 *
 * Importing from the 'lucide-react-native' root pulls its barrel into the
 * bundle, and that barrel re-exports all ~1,780 icon modules. Metro does not
 * tree-shake, so every one of them gets resolved, transformed and serialised on
 * a cold start — roughly 45% of the module graph for 38 icons we actually
 * render. Deep imports cut the graph to what we use.
 *
 * Adding an icon: add a line here (file names are the kebab-case of the
 * component name, but check — Lucide renames icons and keeps the old name as an
 * alias, e.g. CheckCircle2 lives in circle-check.mjs). Never import from
 * 'lucide-react-native' directly in a screen or component.
 */

// Type-only, so the root barrel is erased at build time and never reaches Metro.
export type { LucideIcon, LucideProps } from 'lucide-react-native';

export { default as AlertTriangle } from 'lucide-react-native/icons/triangle-alert';
export { default as Bell } from 'lucide-react-native/icons/bell';
export { default as BookOpen } from 'lucide-react-native/icons/book-open';
export { default as Calendar } from 'lucide-react-native/icons/calendar';
export { default as Camera } from 'lucide-react-native/icons/camera';
export { default as Check } from 'lucide-react-native/icons/check';
export { default as CheckCircle2 } from 'lucide-react-native/icons/circle-check';
export { default as ChevronDown } from 'lucide-react-native/icons/chevron-down';
export { default as ChevronLeft } from 'lucide-react-native/icons/chevron-left';
export { default as ChevronRight } from 'lucide-react-native/icons/chevron-right';
export { default as ChevronUp } from 'lucide-react-native/icons/chevron-up';
export { default as ClipboardCheck } from 'lucide-react-native/icons/clipboard-check';
export { default as Clock } from 'lucide-react-native/icons/clock';
export { default as CreditCard } from 'lucide-react-native/icons/credit-card';
export { default as GraduationCap } from 'lucide-react-native/icons/graduation-cap';
export { default as Hash } from 'lucide-react-native/icons/hash';
export { default as Home } from 'lucide-react-native/icons/house';
export { default as Hourglass } from 'lucide-react-native/icons/hourglass';
export { default as ImageIcon } from 'lucide-react-native/icons/image';
export { default as Info } from 'lucide-react-native/icons/info';
export { default as Landmark } from 'lucide-react-native/icons/landmark';
export { default as Layers } from 'lucide-react-native/icons/layers';
export { default as ListChecks } from 'lucide-react-native/icons/list-checks';
export { default as Loader } from 'lucide-react-native/icons/loader';
export { default as Lock } from 'lucide-react-native/icons/lock';
export { default as LogOut } from 'lucide-react-native/icons/log-out';
export { default as Mail } from 'lucide-react-native/icons/mail';
export { default as MapPin } from 'lucide-react-native/icons/map-pin';
export { default as PartyPopper } from 'lucide-react-native/icons/party-popper';
export { default as Pause } from 'lucide-react-native/icons/pause';
export { default as Pencil } from 'lucide-react-native/icons/pencil';
export { default as Phone } from 'lucide-react-native/icons/phone';
export { default as Play } from 'lucide-react-native/icons/play';
export { default as Receipt } from 'lucide-react-native/icons/receipt';
export { default as RotateCcw } from 'lucide-react-native/icons/rotate-ccw';
export { default as Search } from 'lucide-react-native/icons/search';
export { default as SearchX } from 'lucide-react-native/icons/search-x';
export { default as Send } from 'lucide-react-native/icons/send';
export { default as Share2 } from 'lucide-react-native/icons/share-2';
export { default as ShieldCheck } from 'lucide-react-native/icons/shield-check';
export { default as ShoppingCart } from 'lucide-react-native/icons/shopping-cart';
export { default as Sparkles } from 'lucide-react-native/icons/sparkles';
export { default as Star } from 'lucide-react-native/icons/star';
export { default as Trash2 } from 'lucide-react-native/icons/trash-2';
export { default as User } from 'lucide-react-native/icons/user';
export { default as Users } from 'lucide-react-native/icons/users';
export { default as VideoOff } from 'lucide-react-native/icons/video-off';
export { default as WifiOff } from 'lucide-react-native/icons/wifi-off';
export { default as X } from 'lucide-react-native/icons/x';
export { default as XCircle } from 'lucide-react-native/icons/circle-x';
