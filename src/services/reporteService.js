import api from './api';
export const reporteMatriculas = (params) => api.get('/reportes/matriculas', { params }).then(r => r.data);
export const reportePagos = (params) => api.get('/reportes/pagos', { params }).then(r => r.data);
export const reporteAuditoria = (params) => api.get('/reportes/auditoria', { params }).then(r => r.data);
export const reporteAlumnos = (params) => api.get('/reportes/alumnos', { params }).then(r => r.data);
export const reporteAulas = (params) => api.get('/reportes/aulas', { params }).then(r => r.data);
export const reporteAniosAcademicos= (params) => api.get('/reportes/anios-academicos', { params }).then(r => r.data);
export const reporteConceptos = (params) => api.get('/reportes/conceptos', { params }).then(r => r.data);
export const reportTipoConcepto = (params) => api.get('/reportes/tipos-concepto', { params }).then(r => r.data);
export const reporteDocumento = (params) => api.get('/reportes/tipos-documento', { params }).then(r => r.data);
export const reporteGrados = (params) => api.get('/reportes/grados', { params }).then(r => r.data);
export const reporteNiveles = (params) => api.get('/reportes/niveles', { params }).then(r => r.data);
export const reporteUsuarios = (params) => api.get('/reportes/usuarios', { params }).then(r => r.data);
export const reporteRoles = (params) => api.get('/reportes/roles', { params }).then(r => r.data);
export const reporteFuncionalidades = (params) => api.get('/reportes/funcionalidades', { params }).then(r => r.data);
export const reporteCuotas = (params) => api.get('/reportes/cuotas', { params }).then(r => r.data);
// (mismo patrón para /reportes/alumnos, /aulas, /conceptos, etc.)