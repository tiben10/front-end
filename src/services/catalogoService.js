import api from './api';

const crudFactory = (path) => ({
    listar: () => api.get(`/${path}`).then(r => r.data),
    obtener: (id) => api.get(`/${path}/${id}`).then(r => r.data),
    crear: (data) => api.post(`/${path}`, data).then(r => r.data),
    editar: (id, data) => api.put(`/${path}/${id}`, data).then(r => r.data),
    eliminar: (id) => api.delete(`/${path}/${id}`),
});

export const anioAcademicoService = crudFactory('anios-academicos');
export const nivelService = crudFactory('niveles');
export const gradoService = crudFactory('grados');
export const tipoDocumentoService = crudFactory('tipos-documento');
export const tipoConceptoService = crudFactory('tipos-concepto');
export const rolService = crudFactory('roles');
export const funcionalidadService = crudFactory('funcionalidades');