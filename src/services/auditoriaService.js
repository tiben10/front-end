import api from './api';

export const listarAuditoria = () => api.get('/auditoria').then(r => r.data);
export const listarAuditoriaReciente = () => api.get('/auditoria/recientes').then(r => r.data);
export const obtenerFiltrosAuditoria = () => api.get('/auditoria/filtros').then(r => r.data);

export const buscarAuditoria = (params) => api.get('/auditoria/buscar', { params }).then(r => r.data);
