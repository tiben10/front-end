import api from './api';
export const listarAlumnos = () => api.get('/alumnos').then(r => r.data);
export const obtenerAlumno = (id) => api.get(`/alumnos/${id}`).then(r => r.data);
export const registrarAlumno = (data) => api.post('/alumnos/registrar', data).then(r => r.data);
export const editarAlumno = (id, data) => api.put(`/alumnos/${id}`, data).then(r => r.data);
export const eliminarAlumno = (id) => api.delete(`/alumnos/${id}`);