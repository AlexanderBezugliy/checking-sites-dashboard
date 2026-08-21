import type { NsMatch, SiteRow, StatusKind } from "../types";

const COMPOUND_ZONES = ["org.uk", "co.uk", "gb.net"];

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Публичный суффикс: `gb.net`, `org.uk`, иначе последняя метка (`it`, `com`). */
export function zoneOf(url: string): string {
  const host = hostnameOf(url);
  for (const zone of COMPOUND_ZONES) {
    if (host === zone || host.endsWith(`.${zone}`)) return zone;
  }
  const parts = host.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : host;
}

export function nsProvider(nameservers: string[] | undefined): string {
  if (!nameservers?.length) return "—";
  const providers = nameservers.map((ns) => ns.split(".").slice(-2).join("."));
  const first = providers[0];
  return providers.every((name) => name === first) ? first : "mixed";
}

/** То же окно, что у бота в MONITOR: SSL ≤ 7 дней. */
export const SSL_WARN_DAYS = 7;

/** Дни до истечения; истёкший сертификат = -1. Нет данных — null. */
export function sslDaysLeft(row: SiteRow): number | null {
  if (row.status === "SSL_ERROR") return -1;
  return typeof row.ssl?.daysLeft === "number" ? row.ssl.daysLeft : null;
}

export function isSslSoon(row: SiteRow): boolean {
  const days = sslDaysLeft(row);
  return days != null && days <= SSL_WARN_DAYS;
}

export function sslLabel(row: SiteRow): string {
  if (row.status === "SSL_ERROR") return "истёк";
  if (row.ssl?.daysLeft == null) return "—";
  return `${row.ssl.daysLeft} дн`;
}

/** Причина, если NS/DNS сломаны. Иначе null — серверы в порядке. */
export function nsReason(row: SiteRow): string | null {
  if (row.status === "DNS_ERROR" || row.dns?.ok === false) {
    return row.dns?.error || row.error || "ошибка DNS";
  }
  if (row.dns && row.dns.ns.length === 0) return "NS не найдены";
  return null;
}

/**
 * Сверка с эталоном. Только === true / === false;
 * нет поля, undefined и null — «без эталона».
 */
export function nsMatchOf(row: SiteRow): NsMatch {
  if (row.ns_match === true) return true;
  if (row.ns_match === false) return false;
  return null;
}

export function formatNsHosts(
  hosts: string[] | undefined,
  empty = "—",
): string {
  return hosts?.length ? hosts.join(" · ") : empty;
}

export function statusLabel(row: SiteRow): string {
  if (row.status === "DNS_ERROR") return row.error || "DNS";
  if (row.status === "SSL_ERROR") return "SSL";
  if (row.status === "ERROR") return row.error || "ошибка";
  return String(row.status);
}

export function statusKind(row: SiteRow): StatusKind {
  if (!row.alive || row.redirect?.foreign) return "down";
  if (isSslSoon(row)) return "warn";
  if (row.status === 503) return "cloak";
  if (row.status === 302) return "redirect";
  if (row.status === 200) return "ok";
  return "warn";
}

export function statusKindLabel(kind: StatusKind): string {
  if (kind === "ok") return "200";
  if (kind === "cloak") return "клоака";
  if (kind === "redirect") return "302";
  if (kind === "down") return "падение";
  return "внимание";
}
