import api from './api';
export const listarDeudas = (params) => api.get('/deudas', { params }).then(r => r.data);
export const obtenerDeudaPorMatricula = (codMatricula) => api.get(`/deudas/${codMatricula}`).then(r => r.data);