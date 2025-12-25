import {NextRequest, NextResponse} from "next/server";
import {
    ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS,
    applyUserSessionCookies, clearUserSessionCookies,
    getUserSessionRaw,
    isTokenAboutToExpireWithin
} from "@/lib/auth/session";
import {JwtPayload} from "jsonwebtoken";
import {keycloakClient, verifyToken} from "@/lib/auth/oauth";
import * as arctic from "arctic";
import {Cookies} from "@/lib/auth/constants";


type Handler = (req: NextRequest) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: Handler) {
    return async (req: NextRequest) => {
        const {accessToken, refreshToken} = getUserSessionRaw(req.cookies)

        if(accessToken == null && refreshToken == null) return handler(req);

        if(accessToken != null) {
            let token: JwtPayload | undefined
            try {
                token = await verifyToken(accessToken) as JwtPayload
            } catch {}

            if(token != null && (!isTokenAboutToExpireWithin(token, ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS))) {
                //Token is valid for at least the duration of ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS, so we're good to go!
                return handler(req);
            }
        }

        async function applyAndHandle(applyFn: (cookies: Cookies) => Promise<void> | void) {
            await applyFn(req.cookies)
            const resp = await handler(req);
            await applyFn(resp.cookies)
            return resp;
        }

        if(refreshToken == null) {
            return applyAndHandle((cookies) => clearUserSessionCookies(cookies))
        }

        try {
            const newTokenSet = await keycloakClient.refreshAccessToken(refreshToken)

            //We need to validate that the new token has e.g. the right audience
            let token: JwtPayload | undefined
            try {
                token = await verifyToken(newTokenSet.accessToken()) as JwtPayload
            } catch {}

            if(token == null) {
                return applyAndHandle((cookies) => clearUserSessionCookies(cookies))
            }

            return applyAndHandle((cookies) => applyUserSessionCookies(cookies, newTokenSet.accessToken(), newTokenSet.refreshToken()))
        } catch(e) {
            if (e instanceof arctic.ArcticFetchError) {
                console.error("Failed to refresh token due to fetch error:", e);
                return handler(req);
            } else {
                return applyAndHandle((cookies) => clearUserSessionCookies(cookies))
            }
        }
    };
}


export default withAuth;