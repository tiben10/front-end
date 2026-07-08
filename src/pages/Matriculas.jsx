import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { listarMatriculas, registrarMatricula } from '../services/matriculaService';

const Matriculas = () => {
    const [matriculas, setMatriculas] = useState([]);
    const [form, setForm] = useState({ codAlumno: '', codAula: '', codigoTotp: '' });
    const [loading, setLoading] = useState(false);

    const cargarMatriculas = async () => {
        try {
            const data = await listarMatriculas();
            setMatriculas(data);
        } catch (error) {
            console.error('Error al listar matrículas', error);
        }
    };

    useEffect(() => { cargarMatriculas(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await registrarMatricula(form.codAlumno, form.codAula, form.codigoTotp);
            Swal.fire('¡Matrícula Exitosa!', 'Se generaron las deudas y cuotas del alumno automáticamente.', 'success');
            setForm({ codAlumno: '', codAula: '', codigoTotp: '' });
            cargarMatriculas();
        } catch (error) {
            const msg = error.response?.data || 'Hubo un problema al matricular.';
            Swal.fire('Error', typeof msg === 'string' ? msg : 'No se pudo matricular.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-primary border-bottom pb-2 mb-4">📝 Registro de Matrículas</h2>

            <div className="card shadow-sm mb-5">
                <div className="card-header bg-dark text-white">Ejecutar Nueva Matrícula</div>
                <div className="card-body">
                    <form onSubmit={handleSubmit} className="row g-3 align-items-center">
                        <div className="col-md-4">
                            <label className="form-label fw-bold">ID del Alumno</label>
                            <input type="number" name="codAlumno" value={form.codAlumno} onChange={handleChange} className="form-control" required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">ID del Aula</label>
                            <input type="number" name="codAula" value={form.codAula} onChange={handleChange} className="form-control" required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">Código 2FA (Google Authenticator)</label>
                            <input type="text" name="codigoTotp" value={form.codigoTotp} onChange={handleChange} className="form-control" maxLength={6} required />
                        </div>
                        <div className="col-12 text-end">
                            <button type="submit" className="btn btn-success fw-bold" disabled={loading}>
                                {loading ? 'Matriculando...' : 'Matricular'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <table className="table table-hover table-striped mb-0 text-center border">
                <thead className="table-dark">
                    <tr>
                        <th>ID Matrícula</th>
                        <th>Alumno</th>
                        <th>Aula</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {matriculas.length === 0 ? (
                        <tr><td colSpan="4" className="py-4">No hay matrículas registradas.</td></tr>
                    ) : (
                        matriculas.map(mat => (
                            <tr key={mat.codMatricula}>
                                <td>{mat.codMatricula}</td>
                                <td>{mat.alumno?.nombres} {mat.alumno?.apellidoPaterno}</td>
                                <td>{mat.aula?.grado?.nombre} "{mat.aula?.seccion}"</td>
                                <td><span className={`badge bg-${mat.estado === 'activa' ? 'success' : 'secondary'}`}>{mat.estado}</span></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Matriculas;