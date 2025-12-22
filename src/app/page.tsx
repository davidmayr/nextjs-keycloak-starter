"use client"

import Image from "next/image";
import {useSessionStore} from "@/lib/auth/store";
import {logout} from "@/lib/auth/session-client";
import {useEffect, useState} from "react";

export default function Home() {
  const user = useSessionStore((state) => state.user);
  const getValidAccessToken = useSessionStore((state) => state.getValidAccessToken);

  const [token, setToken] = useState<string | null>("");

  useEffect(() => {
    getValidAccessToken().then((t) => setToken(t));
  }, [getValidAccessToken])


  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Hello, {user ? user.name : "Guest"}!
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>

          <p className={"wrap-anywhere"}>Your access token is {token ?? ""}</p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">



          {!user && <a
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
              href={"/api/auth/login"}
          >
            Login
          </a>}

          {user && <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-white bg-blue-400 px-5 transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
              onClick={() => logout()}
          >
            Logout
          </button>}

          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
