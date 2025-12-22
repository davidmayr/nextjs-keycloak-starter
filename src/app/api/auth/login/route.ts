import {cookies} from "next/headers";
import {CODE_VERIFIER_COOKIE_NAME, generateLoginURL, LOGIN_STATE_COOKIE_NAME} from "@/lib/auth/oauth";
import {NextResponse} from "next/server";

export async function GET() {
    const {url, state, codeVerifier} = generateLoginURL()

    const nextCookies = await cookies();
    nextCookies.set({
        name: LOGIN_STATE_COOKIE_NAME,
        value: state,
        httpOnly: true,
        secure: process.env.NODE_ENV == "production",
        path: '/',
        maxAge: 60 * 5 // 5 min
    })
    nextCookies.set({
        name: CODE_VERIFIER_COOKIE_NAME,
        value: codeVerifier,
        httpOnly: true,
        secure: process.env.NODE_ENV == "production",
        maxAge: 60 * 5 // 5 min
    })

    return NextResponse.redirect(url)
}