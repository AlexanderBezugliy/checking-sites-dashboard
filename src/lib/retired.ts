import { hostnameOf } from "./site";
import type { StatusPayload } from "../types";

/** Домены, за которыми больше не следим. Панель их не показывает. */
const RETIRED_HOSTS = new Set([
  "smooth-spins.org.uk",
  "smoothspins-casino-official.com",
  "smoothspins-casino.co.uk",
  "smoothspins-casino.org.uk",
  "smoothspinscasino.org.uk",
  "slotlaircasino.gb.net",
  "slotlair-casino.gb.net",
  "ck444go.it.com",
  "ck444bd.it.com",
  "cv666.it.com",
  "cv666bd.it.com",
]);

export function isRetiredHost(url: string): boolean {
  return RETIRED_HOSTS.has(hostnameOf(url).toLowerCase());
}

export function withoutRetiredSites(payload: StatusPayload): StatusPayload {
  const data = payload.data.filter((row) => !isRetiredHost(row.url));
  if (data.length === payload.data.length) return payload;
  return {
    ...payload,
    data,
    total_sites: data.length,
  };
}
