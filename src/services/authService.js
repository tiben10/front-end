import api from './api';
import { decodeJwt } from './jwt';

export const login = async (usuario, password) => {
    const response = await api.post('/auth/login', { username: usuario, password });
    const { token } = response.data;

    localStorage.setItem('token', token);

    const claims = decodeJwt(token);
    
    if (claims?.rol) localStorage.setItem('role', claims.rol);

    return claims;
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
};

export const getRole = () => localStorage.getItem('role');
export const isAuthenticated = () => !!localStorage.getItem('token');


export const generar2FA = async () => {
    const response = await api.post('/auth/generar-2fa');
    return response.data; // { secret, qrUrl }
};