import {ReadonlyRequestCookies, ResponseCookies} from "next/dist/server/web/spec-extension/adapters/request-cookies";
import {RequestCookies, ResponseCookie} from "next/dist/compiled/@edge-runtime/cookies";
import {keycloakClient, verifyToken} from "@/lib/auth/oauth";
import * as arctic from "arctic";
import {cookies} from "next/headers";
import {COOKIE_PREFIX, Cookies} from "@/lib/auth/constants";
import * as jwt from "jsonwebtoken";
import {JwtPayload} from "jsonwebtoken";

/**
 * Enable this if your access and refresh tokens get too large to fit in a single cookie
 */
const SPLIT_COOKIES = false

/**
 * Depending on this variable, a new access token is requested from the backend early.
 * E.g. the frontend requests the access token/the middleware checks for its validity, but its just barely valid anymore
 * so future requests might fail. Servers should account for slightly outdated tokens,
 * but we want to prevent failures/immediate refetches.
 *
 * It should also be noted, that on server components the middleware is the last time we can update the access token during
 * that request. So we need to make sure the access token will be at least valid til the request completes
 */
export const ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 20

export interface User {
    email: string;
    emailVerified: boolean;
    name: string;
    preferredUsername: string;
    givenName: string;
    familyName: string;
    id: string;
}

export function applyUserSessionCookies(cookies: Cookies, accessToken: string, refreshToken: string) {
    const settings: Partial<ResponseCookie> = {
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 365,
        secure: process.env.NODE_ENV == "production",
        httpOnly: true,
    }

    if(SPLIT_COOKIES) {
        cookies.set({
            name: COOKIE_PREFIX + "access_token",
            value: accessToken,
            ...settings
        })
        cookies.set({
            name: COOKIE_PREFIX + "refresh_token",
            value: refreshToken,
            ...settings
        })
    } else {
        cookies.set({
            name: COOKIE_PREFIX + "tokens",
            value: JSON.stringify({refreshToken, accessToken}),
            ...settings
        })
    }
}

export function clearUserSessionCookies(cookies: Cookies) {
    if(SPLIT_COOKIES) {
        cookies.delete(COOKIE_PREFIX + "access_token")
        cookies.delete(COOKIE_PREFIX + "refresh_token")
    } else {
        cookies.delete(COOKIE_PREFIX + "tokens")
    }
}


/**
 * Returns the tokenset the user's browser has provided from their cookies. This does not validate
 * the tokens for a valid JWT and doesn't check its signature.
 */
export function getUserSessionRaw(cookies: Cookies): { refreshToken?: string, accessToken?: string } {
    if(SPLIT_COOKIES) {
        const accessToken = cookies.get(COOKIE_PREFIX + "access_token")?.value
        const refreshToken = cookies.get(COOKIE_PREFIX + "refresh_token")?.value
        
        return {accessToken, refreshToken}
    } else {
        const tokenSet = cookies.get(COOKIE_PREFIX + "tokens")?.value
        if(tokenSet == null) {
            return {}
        } else {
            try {
                return JSON.parse(tokenSet)
            } catch {
                return {}
            }
        }
    }
}

export async function logoutServer(cookies: Cookies) {
    const tokens = getUserSessionRaw(cookies);

    clearUserSessionCookies(cookies)

    if(tokens.refreshToken) {
        try {
            await keycloakClient.revokeToken(tokens.refreshToken)
        } catch(e) {
            if (e instanceof arctic.ArcticFetchError) {
                console.error("Failed to refresh token due to fetch error:", e);
            }
        }
    }
}

/**
 * Gets the current session from the request's cookies. If `allowRefresh` is true (default),
 * the refresh token will be used to get a new access token if the current one is expired or about to expire.
 *
 * allowRefresh must be disabled in all react server components, can however be enabled in server actions and routes.
 */
export async function getServerSession(allowRefresh?: boolean) {
    return await getServerSessionFrom(await cookies(), allowRefresh ?? true)
}

async function getServerSessionFrom(cookies: Cookies, allowRefresh: boolean) {
    const {accessToken, refreshToken} = getUserSessionRaw(cookies)
    allowRefresh = allowRefresh && refreshToken != null

    if(accessToken != null) {
        let token: JwtPayload | undefined
        try {
            token = await verifyToken(accessToken) as JwtPayload
        } catch {}



        if(token != null && (!allowRefresh || !isTokenAboutToExpireWithin(token, ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS))) {
            return { token: accessToken, user: mapUserFromJWT(token), tokenExpires: token["exp"] }
        }
    }

    if(refreshToken == null || !allowRefresh) return null

    try {
        const newTokenSet = await keycloakClient.refreshAccessToken(refreshToken)
        applyUserSessionCookies(cookies, newTokenSet.accessToken(), newTokenSet.refreshToken())

        //We need to validate that the new token has e.g. the right audience
        let token: JwtPayload | undefined
        try {
            token = await verifyToken(newTokenSet.accessToken()) as JwtPayload
        } catch {}

        if(token == null) {
            clearUserSessionCookies(cookies)
            return null
        }

        return { token: newTokenSet.accessToken(), user: mapUserFromJWT(token), tokenExpires: Math.floor(newTokenSet.accessTokenExpiresAt().getTime() / 1000) }
    } catch(e) {
        if (e instanceof arctic.ArcticFetchError) {
            console.error("Failed to refresh token due to fetch error:", e);
        } else {
            clearUserSessionCookies(cookies)
        }
    }
    return null
}

export function isTokenAboutToExpireWithin(payload: JwtPayload, buffer?: number) {
    const clockTimestamp = Math.floor(Date.now() / 1000);

    return payload.exp != null && clockTimestamp+(buffer ?? ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS) > payload.exp
}

function mapUserFromJWT(token: JwtPayload): User {
    return {
        id: token.sub!,
        email: token["email"] as string,
        emailVerified: token["email_verified"] as boolean,
        name: token["name"] as string,
        preferredUsername: token["preferred_username"] as string,
        givenName: token["given_name"] as string,
        familyName: token["family_name"] as string,
    }
}