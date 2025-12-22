import {NextRequest, NextResponse} from "next/server";
import {getServerSession} from "@/lib/auth/session";

export function withAuth(handler: (req: NextRequest) => Promise<NextResponse> | NextResponse) {
    return async (req: NextRequest) => {

        try {
            //Getting the session should already handle all the refreshing
            await getServerSession(true);
        } catch {}

        return handler(req);
    };
}

export default withAuth;