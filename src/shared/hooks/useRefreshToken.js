import api from "@/shared/lib/api";
import useAuth from "@/shared/hooks/useAuth"; // Assuming you have an AuthContext
import { getStoredAuthSession, setStoredAuthSession } from "@/shared/lib/authSession";

const useRefreshToken = () => {
    const { setAuth } = useAuth();

    const refresh = async () => {
        const response = await api.get('/auth/refresh', {
            withCredentials: true
        });
        const nextAuth = {
            ...getStoredAuthSession(),
            roles: [response.data.role],
            role: response.data.role,
            status: response.data.status,
            isVerified: response.data.isVerified,
            accessToken: response.data.accessToken
        };
        setAuth(nextAuth);
        setStoredAuthSession(nextAuth);
        return response.data.accessToken;
    }
    return refresh;
};

export default useRefreshToken;
