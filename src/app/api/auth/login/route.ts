import {generateLoginURL, setLoginCookies} from "@/lib/auth/oauth";
import {NextResponse} from "next/server";

export async function GET() {
    const data = generateLoginURL()
    await setLoginCookies(data)
    return NextResponse.redirect(data.url)
}