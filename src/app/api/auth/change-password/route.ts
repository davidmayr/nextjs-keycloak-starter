import {generateUpdateRequiredActionLoginURL, setLoginCookies} from "@/lib/auth/oauth";
import {NextResponse} from "next/server";

export async function GET() {
    const data = generateUpdateRequiredActionLoginURL("UPDATE_PASSWORD")
    await setLoginCookies(data)
    return NextResponse.redirect(data.url)
}