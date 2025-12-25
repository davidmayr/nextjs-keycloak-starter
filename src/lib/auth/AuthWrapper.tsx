"use client"

import {ReactNode, useEffect} from "react";
import {useSessionStore} from "@/lib/auth/store";
import {clearInterval} from "node:timers";


export function AuthWrapper({ children }: Readonly<{ children: ReactNode }>) {

    const updateSession = useSessionStore((it) => it.updateSession)

    useEffect(() => {
        function updateSessionInBackground() {
            updateSession()
                .catch(err => {
                    console.error("Failed to update session", err);
                });
        }
        updateSessionInBackground()

        const visibilityHandler = () => { if (document.visibilityState === "visible") updateSessionInBackground(); }
        document.addEventListener("visibilitychange", visibilityHandler, false)

        const updateTimer = setInterval(() => {
            if (document.visibilityState === "visible") { //Dont refresh forever in the background
                updateSessionInBackground();
            }
        }, 10 * 60 * 1000); // every 10 minutes

        return () => {
            document.removeEventListener("visibilitychange", visibilityHandler, false)
            clearInterval(updateTimer)
        }
    }, [updateSession])

    return children;
}