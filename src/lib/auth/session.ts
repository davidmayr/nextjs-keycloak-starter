import {ReadonlyRequestCookies} from "next/dist/server/web/spec-extension/adapters/request-cookies";
import {ResponseCookie} from "next/dist/compiled/@edge-runtime/cookies";
import {keycloakClient, verifyToken} from "@/lib/auth/oauth";
import * as arctic from "arctic";
import {cookies} from "next/headers";
import {COOKIE_PREFIX} from "@/lib/auth/constants";
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
const ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 20

export interface User {
    email: string;
    emailVerified: boolean;
    name: string;
    preferredUsername: string;
    givenName: string;
    familyName: string;
    id: string;
}

export function applyUserSessionCookies(cookies: ReadonlyRequestCookies, accessToken: string, refreshToken: string) {
    const settings: Partial<ResponseCookie> = {
        sameSite: "lax",
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

export function clearUserSessionCookies(cookies: ReadonlyRequestCookies) {
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
function getUserSessionUnsafe(cookies: ReadonlyRequestCookies): { refreshToken?: string, accessToken?: string } {
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

export async function logoutServer(cookies: ReadonlyRequestCookies) {
    const tokens = getUserSessionUnsafe(cookies);

    clearUserSessionCookies(cookies)

    if(tokens.refreshToken) {
        try {
            await keycloakClient.revokeToken(tokens.refreshToken)
        } catch(e) {
            if (e instanceof arctic.ArcticFetchError) {
                // Failed to call `fetch()`
                const cause = e.cause;
                //TODO: Log this error as this is not a user error (probably)
            }
        }
    }
}

export async function getServerSession(allowRefresh?: boolean) {
    return await getServerSessionFrom(await cookies(), allowRefresh ?? true)
}

async function getServerSessionFrom(cookies: ReadonlyRequestCookies, allowRefresh: boolean) {
    const {accessToken, refreshToken} = getUserSessionUnsafe(cookies)
    allowRefresh = allowRefresh && refreshToken != null

    if(accessToken != null) {
        let token: JwtPayload | undefined
        try {
            token = await verifyToken(accessToken) as JwtPayload
        } catch {}


        const clockTimestamp = Math.floor(Date.now() / 1000);

        if(token != null && (!allowRefresh || typeof token["exp"] !== "number" || clockTimestamp+ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS <= token["exp"])) {
            return { token: accessToken, user: mapUserFromJWT(token), tokenExpires: token["exp"] }
        }
    }

    if(refreshToken == null || !allowRefresh) return null

    try {
        const newTokenSet = await keycloakClient.refreshAccessToken(refreshToken)
        applyUserSessionCookies(cookies, newTokenSet.accessToken(), newTokenSet.refreshToken())

        return { token: newTokenSet.accessToken(), user: mapUserFromJWT(jwt.decode(newTokenSet.accessToken()) as JwtPayload), tokenExpires: Math.floor(newTokenSet.accessTokenExpiresAt().getTime() / 1000) }
    } catch(e) {
        if (e instanceof arctic.ArcticFetchError) {
            // Failed to call `fetch()`
            const cause = e.cause;
            //TODO: Log this error as this is not a user error (probably)
        } else {
            clearUserSessionCookies(cookies)
        }
    }
    return null
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