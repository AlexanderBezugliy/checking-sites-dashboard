import { next } from "@vercel/functions";
import {
  authorizeBasic,
  parseDashboardUsers,
  unauthorizedResponse,
} from "./src/lib/basicAuth";

/**
 * HTTP Basic Auth на всех путях Vercel (включая JS/CSS).
 * Локальный `npm run dev` это не включает.
 */
export default function middleware(request: Request) {
  const users = parseDashboardUsers(process.env.DASHBOARD_USERS);
  if (authorizeBasic(request.headers.get("authorization"), users)) {
    return next();
  }
  return unauthorizedResponse();
}
