import React, { createContext, useEffect, useState } from "react";
import {
    AUTH_SESSION_EVENT,
    getStoredAuthSession,
} from "@/shared/lib/authSession";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState(() => getStoredAuthSession());

    useEffect(() => {
        const syncAuthSession = () => {
            setAuth(getStoredAuthSession());
        };

        window.addEventListener("storage", syncAuthSession);
        window.addEventListener(AUTH_SESSION_EVENT, syncAuthSession);

        return () => {
            window.removeEventListener("storage", syncAuthSession);
            window.removeEventListener(AUTH_SESSION_EVENT, syncAuthSession);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ auth, setAuth }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext;
