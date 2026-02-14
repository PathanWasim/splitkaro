import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('splitkaro_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Track whether a refresh is already in progress
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
}

// Handle 401 errors — attempt refresh before redirecting to login
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            const refreshToken = localStorage.getItem('splitkaro_refresh_token');

            // No refresh token — go to login
            if (!refreshToken) {
                clearAuth();
                return Promise.reject(error);
            }

            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = res.data.data;

                localStorage.setItem('splitkaro_token', accessToken);
                localStorage.setItem('splitkaro_refresh_token', newRefreshToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                processQueue(null, accessToken);

                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearAuth();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

function clearAuth() {
    localStorage.removeItem('splitkaro_token');
    localStorage.removeItem('splitkaro_refresh_token');
    localStorage.removeItem('splitkaro_user');
    window.location.href = '/login';
}

export default api;
