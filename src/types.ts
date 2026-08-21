/** Контракт `status.json` из репозитория checking-sites. Новые поля монитора добавляйте сюда. */

export type HttpStatus = number | "DNS_ERROR" | "SSL_ERROR" | "ERROR";

export type DnsInfo = {
  ns: string[];
  a: string[];
  ok: boolean;
  error: string | null;
};

export type SslInfo = {
  daysLeft: number | null;
  validTo: string | null;
  error?: string | null;
} | null;

export type RedirectInfo = {
  status: number;
  location: string | null;
  foreign: boolean;
} | null;

export type NsMatch = true | false | null;

export type SiteRow = {
  url: string;
  status: HttpStatus;
  ok: boolean;
  alive: boolean;
  duration?: number;
  dns?: DnsInfo;
  ssl?: SslInfo;
  redirect?: RedirectInfo;
  error?: string;
  /** Эталон NS1+NS2 с монитора. Нет сверки — `[]`. */
  ns_expected?: string[];
  /** Результат сверки множеств NS. Нет поля / нет эталона — как `null`. */
  ns_match?: NsMatch;
};

export type StatusPayload = {
  last_update: string;
  last_digest_at?: string | null;
  total_sites: number;
  alive_count: number;
  failed_count: number;
  data: SiteRow[];
};

export type DataSource = "github" | "snapshot";

export type StatusKind = "ok" | "cloak" | "down" | "warn";

export type LatencyBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
};

export type NamedCount = {
  name: string;
  count: number;
};

export type NsProblem = {
  url: string;
  host: string;
  reason: string;
  nameservers: string[];
};

export type NsMismatch = {
  url: string;
  host: string;
  expected: string[];
  live: string[];
};

export type Metrics = {
  total: number;
  alive: number;
  failed: number;
  http200: number;
  cloak503: number;
  otherHttp: number;
  dnsErrors: number;
  sslErrors: number;
  sslSoon: number;
  sslMinDays: number | null;
  sslMaxDays: number | null;
  foreignRedirects: number;
  durationMin: number | null;
  durationP50: number | null;
  durationP95: number | null;
  durationMax: number | null;
  buckets: LatencyBucket[];
  zones: NamedCount[];
  nsProviders: NamedCount[];
  nsOk: number;
  nsProblems: NsProblem[];
  nsMatchOk: number;
  nsMatchBad: number;
  nsMatchSkip: number;
  nsMismatches: NsMismatch[];
  slowest: SiteRow[];
  duplicateUrls: number;
};

export type TableFilter =
  | "all"
  | "200"
  | "503"
  | "down"
  | "ns"
  | "nsok"
  | "nsbad"
  | "nsskip"
  | "ssl";
export type SortKey = "host" | "status" | "duration" | "zone" | "ssl";
export type SortDir = "asc" | "desc";
