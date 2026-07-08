import api from './api';
export const listarConceptos = () => api.get('/conceptos').then(r => r.data);
export const crearConcepto = (data) => api.post('/conceptos', data).then(r => r.data);
export const editarConcepto = (id, data) => api.put(`/conceptos/${id}`, data).then(r => r.data);
export const eliminarConcepto = (id) => api.delete(`/conceptos/${id}`);
export const clonarConceptos = (codAnioOrigen, codAnioDestino) =>
    api.post('/conceptos/clonar', null, { params: { codAnioOrigen, codAnioDestino } }).then(r => r.data);