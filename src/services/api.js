import axios from 'axios';

// Creamos una instancia base de Axios
const api = axios.create({
    baseURL: 'http://localhost:8081/api'
});

// ¡EL INTERCEPTOR! 
// Antes de que cualquier petición salga hacia el Java, hacemos esto:
api.interceptors.request.use(
    (config) => {
        // Sacamos el token de la caja fuerte
        const token = localStorage.getItem('token');
        
        // Si hay token, se lo pegamos en la cabecera (Header)
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;