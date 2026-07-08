import api from './api';
export const obtenerParametros = () => api.get('/parametros').then(r => r.data);
