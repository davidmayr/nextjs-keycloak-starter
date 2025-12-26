import {RequestCookies, ResponseCookies} from "next/dist/compiled/@edge-runtime/cookies";
import {ReadonlyRequestCookies} from "next/dist/server/web/spec-extension/adapters/request-cookies";

export const COOKIE_PREFIX = "ses_"

export type Cookies = RequestCookies | ResponseCookies | ReadonlyRequestCookies
