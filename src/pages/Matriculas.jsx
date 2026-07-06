import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Matriculas = () => {
    const [matriculas, setMatriculas] = useState([]);
    const [form, setForm] = useState({ codAlumno: '', codAula: '' });

    const cargarMatriculas = async () => {
        try {
            const response = await api.get('/matriculas/lista'); // Necesitarás este GET en Java luego
            setMatriculas(response.data);
        } catch (error) {
            console.error("Aún no existe el endpoint GET en Java", error);
        }
    };

    useEffect(() => { cargarMatriculas(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Aquí consumimos el endpoint transaccional que ya tienes listo en Java
            await api.post(`/matriculas/registrar?codAlumno=${form.codAlumno}&codAula=${form.codAula}`);
            
            Swal.fire('¡Matrícula Exitosa!', 'Se generaron las deudas y cuotas del alumno automáticamente.', 'success');
            setForm({ codAlumno: '', codAula: '' });
            cargarMatriculas();
        } catch (error) {
            Swal.fire('Error', 'Hubo un problema. Verifica que el alumno y aula existan.', 'error');
        }
    };

    return (
        <div>
            <h2 className="text-primary border-bottom pb-2 mb-4">📝 Registro de Matrículas</h2>
            
            <div className="card shadow-sm mb-5">
                <div className="card-header bg-dark text-white">Ejecutar Nueva Matrícula</div>
                <div className="card-body">
                    <form onSubmit={handleSubmit} className="row g-3 align-items-center">
                        <div className="col-md-5">
                            <label className="form-label fw-bold">ID del Alumno</label>
                            <input type="number" name="codAlumno" value={form.codAlumno} onChange={handleChange} className="form-control" placeholder="Ej: 1" required />
                        </div>
                        <div className="col-md-5">
                            <label className="form-label fw-bold">ID del Aula</label>
                            <input type="number" name="codAula" value={form.codAula} onChange={handleChange} className="form-control" placeholder="Ej: 1" required />
                        </div>
                        <div className="col-md-2 mt-5">
                            <button type="submit" className="btn btn-success w-100 fw-bold">Matricular</button>
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
                        <tr><td colSpan="4" className="py-4">No hay matrículas registradas (O falta el endpoint GET en Java).</td></tr>
                    ) : (
                        matriculas.map(mat => (
                            <tr key={mat.codMatricula}>
                                <td>{mat.codMatricula}</td>
                                <td>{mat.alumno?.nombre} {mat.alumno?.apellido}</td>
                                <td>{mat.aula?.grado} {mat.aula?.seccion}</td>
                                <td><span className="badge bg-success">ACTIVA</span></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Matriculas;