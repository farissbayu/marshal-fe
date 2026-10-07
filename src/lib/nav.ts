import {
  Activity,
  Car,
  FlaskConical,
  LayoutDashboard,
  LifeBuoy,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    to: "/overview",
    icon: LayoutDashboard,
    description: "Ringkasan shift & monitoring live",
  },
  { label: "Yard", to: "/yard", icon: Warehouse, description: "Kondisi yard & aksi operasional" },
  { label: "Cars", to: "/cars", icon: Car, description: "Daftar & detail kendaraan" },
  {
    label: "Action Center",
    to: "/actions",
    icon: ShieldCheck,
    description: "Antrean keputusan manusia",
  },
  { label: "Assistance", to: "/assistance", icon: LifeBuoy, description: "Kasus bantuan darurat" },
  {
    label: "Quality & Rework",
    to: "/quality/inspections",
    icon: Activity,
    description: "Inspeksi, report & rework",
  },
  {
    label: "Test Lab",
    to: "/lab",
    icon: FlaskConical,
    description: "Skenario, job & release gate",
  },
];
