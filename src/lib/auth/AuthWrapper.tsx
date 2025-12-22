"use client"

import {ReactNode, useEffect} from "react";
import {useSessionStore} from "@/lib/auth/store";


export function AuthWrapper({ children }: Readonly<{ children: ReactNode }>) {

    const updateSession = useSessionStore((it) => it.updateSession)

    useEffect(() => {
        updateSession()
            .catch(err => {
                console.error(err);
            });
    }, [updateSession])

    return children;
}