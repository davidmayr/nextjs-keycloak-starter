"use client"

import {useSessionStore} from "@/lib/auth/store";
import {logout} from "@/lib/auth/session-client";
import {useEffect, useState} from "react";
import {HomeComponent} from "@/components/Home";

export default function Home() {
  const user = useSessionStore((state) => state.user);
  const getValidAccessToken = useSessionStore((state) => state.getValidAccessToken);

  const [token, setToken] = useState<string | null>("");

  useEffect(() => {
    getValidAccessToken().then((t) => setToken(t));
  }, [getValidAccessToken])


  return (
    <HomeComponent token={token} user={user} onLogout={() => logout()} />
  );
}
