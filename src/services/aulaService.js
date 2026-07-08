import api from './api';
export const listarAulas = () => api.get('/aulas').then(r => r.data);
export const obtenerAula = (id) => api.get(`/aulas/${id}`).then(r => r.data);
export const crearAula = (data) => api.post('/aulas', data).then(r => r.data);
export const editarAula = (id, data) => api.put(`/aulas/${id}`, data).then(r => r.data);
export const eliminarAula = (id) => api.delete(`/aulas/${id}`);