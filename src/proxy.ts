import { NextResponse } from 'next/server'
import withAuth from "@/lib/auth/middleware";

export const proxy = withAuth(() => {

    return NextResponse.next()
})