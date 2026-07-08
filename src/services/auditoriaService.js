import api from './api';
export const listarAuditoria = () => api.get('/auditoria').then(r => r.data);