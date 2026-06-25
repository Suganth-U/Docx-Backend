import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from "@/shared/hooks/useAuth";
import api from "@/shared/lib/api";
import {
    clearAuthSessionStorage,
    getLoginRouteForAllowedRoles,
    getStoredAuthSession,
    setStoredAuthSession,
} from "@/shared/lib/authSession";

const clearClientAuthState = (setAuth) => {
    setAuth({});
    clearAuthSessionStorage();
};

const RequireAuth = ({ allowedRoles }) => {
    const { auth, setAuth } = useAuth();
    const location = useLocation();
    const storedSession = getStoredAuthSession();
    const accessToken = auth?.accessToken || storedSession?.accessToken;
    const userRole = (auth?.roles?.[0] || auth?.role || storedSession?.roles?.[0] || storedSession?.role || '').toLowerCase();
    const isWrongRole = Boolean(accessToken && (!userRole || !allowedRoles.includes(userRole)));
    const requiresAccountValidation =
        Boolean(accessToken) && ['doctor', 'patient'].includes(userRole) && allowedRoles.includes(userRole);
    const [accountGate, setAccountGate] = useState({
        state: requiresAccountValidation ? 'checking' : 'idle',
        redirectTo: '',
    });

    const redirectToLogin = useMemo(
        () => getLoginRouteForAllowedRoles(allowedRoles, location.pathname),
        [allowedRoles, location.pathname]
    );
    const hasStoredSession = Boolean(storedSession?.accessToken);

    useEffect(() => {
        if (accessToken && !hasStoredSession) {
            clearClientAuthState(setAuth);
        }
    }, [accessToken, hasStoredSession, setAuth]);

    useEffect(() => {
        if (isWrongRole) {
            clearClientAuthState(setAuth);
        }
    }, [isWrongRole, setAuth]);

    useEffect(() => {
        if (!accessToken || !requiresAccountValidation) {
            setAccountGate({ state: 'idle', redirectTo: '' });
            return undefined;
        }

        let cancelled = false;
        setAccountGate({ state: 'checking', redirectTo: '' });

        const validateAccountSession = async () => {
            try {
                const { data } = await api.get('/auth/me');

                if (cancelled) {
                    return;
                }

                const isBlocked = data.status === 'blocked';
                const isInvalidDoctor = data.role === 'doctor' && (data.status !== 'active' || !data.isVerified);

                if (data.role !== userRole || isBlocked || isInvalidDoctor) {
                    clearClientAuthState(setAuth);
                    setAccountGate({
                        state: 'blocked',
                        redirectTo: getLoginRouteForAllowedRoles(allowedRoles, location.pathname),
                    });
                    return;
                }

                const currentStoredSession = getStoredAuthSession();
                const nextAuth = {
                    ...currentStoredSession,
                    _id: data._id || currentStoredSession?._id,
                    role: data.role,
                    roles: [data.role],
                    status: data.status,
                    isVerified: data.isVerified,
                    name: data.name || currentStoredSession?.name,
                    email: data.email || currentStoredSession?.email,
                    accessToken,
                };

                setAuth(nextAuth);
                setStoredAuthSession(nextAuth);
                setAccountGate({ state: 'ready', redirectTo: '' });
            } catch {
                if (cancelled) {
                    return;
                }

                clearClientAuthState(setAuth);
                setAccountGate({
                    state: 'blocked',
                    redirectTo: getLoginRouteForAllowedRoles(allowedRoles, location.pathname),
                });
            }
        };

        validateAccountSession();

        return () => {
            cancelled = true;
        };
    }, [accessToken, allowedRoles, requiresAccountValidation, location.pathname, setAuth, userRole]);

    if (!accessToken || !hasStoredSession) {
        return <Navigate to={redirectToLogin} state={{ from: location }} replace />;
    }

    if (isWrongRole || !allowedRoles.includes(userRole)) {
        return <Navigate to={redirectToLogin} state={{ from: location }} replace />;
    }

    if (requiresAccountValidation) {
        if (accountGate.redirectTo) {
            return <Navigate to={accountGate.redirectTo} state={{ from: location }} replace />;
        }

        if (accountGate.state !== 'ready') {
            return null;
        }
    }

    return <Outlet />;
};

export default RequireAuth;
