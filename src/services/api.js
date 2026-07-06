import axios from 'axios';

//ngrok temporalS
const baseURL = import.meta.env.VITE_API_URL;
// Creamos una instancia base de Axios
const api = axios.create({
    baseURL: baseURL,
    headers: {
    'Content-Type': 'application/json',
    // ¡ESTA LÍNEA ES CRUCIAL PARA NGROK!
    'ngrok-skip-browser-warning': 'true' 
    }
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