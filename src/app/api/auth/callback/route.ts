import {cookies} from "next/headers";
import {CODE_VERIFIER_COOKIE_NAME, keycloakClient, LOGIN_STATE_COOKIE_NAME} from "@/lib/auth/oauth";
import {NextRequest, NextResponse} from "next/server";
import * as arctic from "arctic";
import {applyUserSessionCookies} from "@/lib/auth/session";

/**
 * Handles the incoming callbacks from keycloak. Automatically redirects the user
 * back to the homepage after completing/failing the login attempt.
 */
export async function GET(request: NextRequest) {
    const nextCookies = await cookies();
    const searchParams = request.nextUrl.searchParams

    const loginState = nextCookies.get(LOGIN_STATE_COOKIE_NAME)?.value
    const codeVerifier = nextCookies.get(CODE_VERIFIER_COOKIE_NAME)?.value

    //Technically these expire after 5 minutes anyway, but we don't need them anymore so bye bye
    nextCookies.delete(LOGIN_STATE_COOKIE_NAME)
    nextCookies.delete(CODE_VERIFIER_COOKIE_NAME)

    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if(!code || !loginState || !codeVerifier || state != loginState) {
        //Invalid login attempt, abort.
        //TODO: Maybe separate error redirect
        return NextResponse.redirect(process.env.PUBLIC_URL as string)
    }


    try {
        const tokens = await keycloakClient.validateAuthorizationCode(code, codeVerifier);
        const accessToken = tokens.accessToken();
        const refreshToken = tokens.refreshToken();

        applyUserSessionCookies(nextCookies, accessToken, refreshToken)

        return NextResponse.redirect(process.env.PUBLIC_URL as string)
    } catch (e) {
        if (e instanceof arctic.ArcticFetchError) {
            console.error("Failed to refresh token due to fetch error:", e);
        }

        //Invalid login attempt, abort.
        //TODO: Maybe separate error redirect
        return NextResponse.redirect(process.env.PUBLIC_URL as string)
    }

}