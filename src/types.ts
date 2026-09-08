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

export type SubfolderMatch = true | false | null;

export type SubfolderGlue = "canonical" | "301" | null;

export type SubfolderMode = "home" | "all" | "page" | null;

export type SubfolderInfo = {
  folder: string | null;
  csv: string | null;
  mode: SubfolderMode;
  match: SubfolderMatch;
  glue: SubfolderGlue | string | null;
  live_folder: string | null;
  error: string | null;
};

export type CloakPresent = true | false | null;

export type CloakInfo = {
  present: CloakPresent;
  status: 503 | null;
  error: string | null;
};

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
  /** GSC-проверка. `null` / нет поля — skip. */
  index?: IndexInfo | null;
  /**
   * Подпапка из аптайма. Нет ключа / `null` — колонок нет.
   * Не путать с `redirect` (клоака `?view=`, чужой домен).
   */
  subfolder?: SubfolderInfo | null;
  /**
   * Клоака: запрос без `?view=`.
   * `present: false` — точно нет (A дал 200). `true` / `null` с `A … not 200/503` — колонка 503.
   * Не брать из `status` / `redirect`.
   */
  cloak?: CloakInfo | null;
};

export type IndexPage = {
  url: string;
  /** Имя слота из sites.csv (`bonus`, `app`). Не хвост URL. */
  slot?: string;
  indexed: boolean | null;
  coverageState?: string | null;
  verdict?: string | null;
  lastCrawlTime?: string | null;
  pageFetchState?: string | null;
  checked_at?: string | null;
  error?: string | null;
  /** Google сегодня не ответил, статус сохранён со вчера. */
  stale?: true;
  status_from?: string;
};

export type IndexSitemap = {
  source?: string | null;
  urls?: string[];
  fetched_at?: string | null;
  error?: string | null;
};

export type IndexInfo = {
  indexed: boolean | null;
  coverageState?: string | null;
  verdict?: string | null;
  lastCrawlTime?: string | null;
  siteUrl?: string | null;
  checked_at?: string | null;
  error?: string | null;
  noindex?: boolean;
  pages_total?: number;
  pages_indexed?: number;
  pages_checked?: number;
  sitemap?: IndexSitemap;
  pages?: IndexPage[];
};

export type IndexKind =
  | "ok"
  | "partial"
  | "bad"
  | "noindex"
  | "stale"
  | "unknown"
  | "skip";

export type IndexProblem = {
  url: string;
  host: string;
  reason: string;
  ratio: string;
};

export type StatusPayload = {
  last_update: string;
  last_digest_at?: string | null;
  /** Время последней SEO-проверки (GSC), отдельно от аптайма. */
  index_last_update?: string | null;
  index_queue_cursor?: number | null;
  total_sites: number;
  alive_count: number;
  failed_count: number;
  data: SiteRow[];
};

export type DataSource = "github" | "snapshot";

export type StatusKind = "ok" | "cloak" | "redirect" | "down" | "warn";

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
  http302: number;
  /** Клоака без `?view=`. Не HTTP-статус аптайма. */
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
  homesIndexed: number;
  homesNotIndexed: number;
  homesUnknown: number;
  homesStale: number;
  homesNoindex: number;
  homesSkip: number;
  homesPartial: number;
  pagesIndexedTotal: number;
  pagesCheckedTotal: number;
  indexQueueCursor: number | null;
  indexProblems: IndexProblem[];
  indexBad: IndexProblem[];
  indexStale: IndexProblem[];
  indexPartial: IndexProblem[];
};

export type TableFilter =
  | "all"
  | "200"
  | "302"
  | "503"
  | "down"
  | "ns"
  | "nsok"
  | "nsbad"
  | "nsskip"
  | "ssl"
  | "indexok"
  | "indexbad"
  | "indexpartial"
  | "indexstale"
  | "indexnoindex"
  | "indexskip"
  | "indexunknown";
export type SortKey = "host" | "status" | "duration" | "zone" | "ssl" | "index";
export type SortDir = "asc" | "desc";
