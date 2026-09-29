import { Bot, BookOpen, CalendarDays, ChartNoAxesCombined, Crown, Dumbbell, FileText, House, Salad, Settings, TrendingDown, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  description?: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Home", icon: House },
  { href: "/nutrition", label: "Nutrition", icon: Salad },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: TrendingDown },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/calendar", label: "Calendrier", icon: CalendarDays, description: "Jours de salle, adhérence, heatmap" },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined, description: "Graphiques et corrélations" },
  { href: "/coach", label: "Coach IA", icon: Bot, description: "Pose tes questions à ARISE AI" },
  { href: "/report", label: "Rapport hebdo", icon: FileText, description: "Bilan de la semaine" },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen, description: "Conseils basés sur la recherche" },
  { href: "/status", label: "Statut", icon: Crown, description: "Niveau, rang et statistiques" },
  { href: "/settings", label: "Réglages", icon: Settings, description: "Profil, objectifs, données" },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
