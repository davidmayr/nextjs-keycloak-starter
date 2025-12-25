
import {getServerSession, logoutServer} from "@/lib/auth/session";
import {cookies} from "next/headers";
import {HomeComponent} from "@/components/Home";
import { redirect, RedirectType } from 'next/navigation'

export default async function Home() {
  const session = await getServerSession(false)

  return (
      <HomeComponent token={session?.token} user={session?.user} onLogout={async () => {
            "use server"
            await logoutServer(await cookies())
            redirect(process.env.PUBLIC_URL + "/server", RedirectType.replace)
      }} />
  );
}
