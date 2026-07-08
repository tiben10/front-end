import api from './api';
export const listarCuotasPago = (codAlumno, codAnioAcademico) =>
    api.get('/pagos/lista', { params: { codAlumno, codAnioAcademico } }).then(r => r.data);
export const procesarPago = (codCuota) =>
    api.post('/pagos/procesar', { codCuota }).then(r => r.data);