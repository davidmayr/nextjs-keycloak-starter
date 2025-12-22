import {NextResponse} from "next/server";
import {getServerSession} from "@/lib/auth/session";

export async function POST() {
    const session = await getServerSession()

    if(!session) return NextResponse.json({"error": "Unauthorized"}, { status: 401 })

    return NextResponse.json({ token: session.token, expires: session.tokenExpires })
}