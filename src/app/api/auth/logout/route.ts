import {NextResponse} from "next/server";
import {getServerSession, logoutServer} from "@/lib/auth/session";
import {cookies} from "next/headers";

export async function POST() {
    const session = await getServerSession()
    if(!session) return NextResponse.json({"error": "Unauthorized"}, { status: 401 })


    const nextCookies = await cookies()
    await logoutServer(nextCookies)

    return NextResponse.json({ "success": true })
}