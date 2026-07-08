import api from './api';
export const obtenerPermisosPorRol = (idRol) => api.get(`/permisos/rol/${idRol}`).then(r => r.data);
export const aplicarPermisos = (idRol, permisos) =>
    api.post('/permisos/aplicar', { idRol, permisos }).then(r => r.data);