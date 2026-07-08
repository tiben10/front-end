import api from './api';

export const listarMatriculas = () => api.get('/matriculas').then(r => r.data);
export const obtenerMatricula = (id) => api.get(`/matriculas/${id}`).then(r => r.data);
export const anularMatricula = (id) => api.delete(`/matriculas/${id}`);

// El backend EXIGE codigoTotp (2FA) para matricular — ver MatriculaController
export const registrarMatricula = (codAlumno, codAula, codigoTotp) =>
    api.post('/matriculas/registrar', null, {
        params: { codAlumno, codAula, codigoTotp }
    }).then(r => r.data);