import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;
//const baseURL = "http://localhost:8081";

const api = axios.create({
    baseURL: `${baseURL}/api`,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || '';

if (error.response?.status === 401 && !url.includes('/auth/login')) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/';
}
        return Promise.reject(error);
    }
);

export default api;