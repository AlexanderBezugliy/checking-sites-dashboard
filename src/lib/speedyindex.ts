/** Реализация лежит в `api/index-submit.ts`, чтобы Vercel поднимал функцию без импортов. */
export {
  SPEEDYINDEX_MAX_URLS,
  SPEEDYINDEX_TOKENS_PER_URL,
  acceptSubmitUrls,
  submitIndexUrls,
} from "../../api/index-submit.ts";
export type { IndexSubmitBody, IndexSubmitResult } from "../../api/index-submit.ts";
