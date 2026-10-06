import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  CircleCheck,
  EyeOff,
  LayoutGrid,
  Search,
  ServerCrash,
  ShieldAlert,
  Waypoints,
} from "lucide-react";
import type { Metrics, TableFilter } from "../types";

export type ShellNavItem = {
  id: TableFilter;
  label: string;
  icon: LucideIcon;
  count: (metrics: Metrics) => number;
  alert: (metrics: Metrics) => boolean;
};

/** Короткие фильтры боковой панели. Полный список по-прежнему в меню таблицы. */
export const SHELL_NAV: ShellNavItem[] = [
  {
    id: "all",
    label: "Все сайты",
    icon: LayoutGrid,
    count: (metrics) => metrics.total,
    alert: () => false,
  },
  {
    id: "down",
    label: "Ответ сервера",
    icon: ServerCrash,
    count: (metrics) => metrics.failed,
    alert: (metrics) => metrics.failed > 0,
  },
  {
    id: "indexissue",
    label: "Индексация",
    icon: Search,
    count: (metrics) => metrics.indexIssues,
    alert: (metrics) => metrics.indexIssues > 0,
  },
  {
    id: "ssl",
    label: "SSL",
    icon: ShieldAlert,
    count: (metrics) => metrics.sslLive,
    alert: (metrics) => metrics.sslLive > 0,
  },
  {
    id: "200",
    label: "HTTP 200",
    icon: CircleCheck,
    count: (metrics) => metrics.http200,
    alert: () => false,
  },
  {
    id: "302",
    label: "Редирект 302",
    icon: ArrowRightLeft,
    count: (metrics) => metrics.http302,
    alert: () => false,
  },
  {
    id: "503",
    label: "Клоака 503",
    icon: EyeOff,
    count: (metrics) => metrics.cloak503,
    alert: (metrics) => metrics.cloak503 > 0,
  },
  {
    id: "nsbad",
    label: "NS не совпало",
    icon: Waypoints,
    count: (metrics) => metrics.nsMatchBad,
    alert: (metrics) => metrics.nsMatchBad > 0,
  },
];
