
import api from './api';
export const listarUsuarios = () => api.get('/usuarios').then(r => r.data);
export const crearUsuario = (data) => api.post('/usuarios', data).then(r => r.data);
export const editarUsuario = (id, data) => api.put(`/usuarios/${id}`, data).then(r => r.data);
export const eliminarUsuario = (id) => api.delete(`/usuarios/${id}`);
export const cambiarPassword = (data) => api.put('/usuarios/cambiar-password', data).then(r => r.data);
export const restablecerPassword = (id, passwordNueva) => api.put(`/usuarios/${id}/restablecer-password`, { passwordNueva }).then(r => r.data);