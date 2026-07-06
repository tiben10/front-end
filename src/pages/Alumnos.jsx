import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Alumnos = () => {
    const [alumnos, setAlumnos] = useState([]);
    const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', correo: '' });

    // OJO: Si aún no tienes los métodos GET y POST de Alumnos en tu Java, 
    // la tabla estará vacía por ahora, pero la interfaz ya queda lista.
    const cargarAlumnos = async () => {
        try {
            const response = await api.get('/alumnos');
            setAlumnos(response.data);
        } catch (error) {
            console.error("Aún no existe el endpoint GET en Java o hay error", error);
        }
    };

    useEffect(() => { cargarAlumnos(); }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/alumnos', form);
            Swal.fire('¡Éxito!', 'Alumno registrado correctamente', 'success');
            setForm({ nombre: '', apellido: '', dni: '', correo: '' });
            cargarAlumnos();
        } catch (error) {
            Swal.fire('Error', 'No se pudo registrar el alumno (Revisa tu backend)', 'error');
        }
    };

    return (
        <div>
            <h2 className="text-primary border-bottom pb-2 mb-4">👨‍🎓 Gestión de Alumnos</h2>
            
            <div className="card shadow-sm mb-5">
                <div className="card-header bg-dark text-white">Registrar Nuevo Alumno</div>
                <div className="card-body">
                    <form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-3">
                            <input type="text" name="nombre" value={form.nombre} onChange={handleChange} className="form-control" placeholder="Nombre" required />
                        </div>
                        <div className="col-md-3">
                            <input type="text" name="apellido" value={form.apellido} onChange={handleChange} className="form-control" placeholder="Apellido" required />
                        </div>
                        <div className="col-md-3">
                            <input type="text" name="dni" value={form.dni} onChange={handleChange} className="form-control" placeholder="DNI" required />
                        </div>
                        <div className="col-md-3">
                            <input type="email" name="correo" value={form.correo} onChange={handleChange} className="form-control" placeholder="Correo" required />
                        </div>
                        <div className="col-12 text-end">
                            <button type="submit" className="btn btn-primary">Guardar Alumno</button>
                        </div>
                    </form>
                </div>
            </div>

            <table className="table table-hover table-striped mb-0 text-center border">
                <thead className="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Nombre Completo</th>
                        <th>DNI</th>
                        <th>Correo</th>
                    </tr>
                </thead>
                <tbody>
                    {alumnos.length === 0 ? (
                        <tr><td colSpan="4" className="py-4">No hay alumnos registrados (O falta el endpoint en Java).</td></tr>
                    ) : (
                        alumnos.map(al => (
                            <tr key={al.codAlumno}>
                                <td>{al.codAlumno}</td>
                                <td>{al.nombre} {al.apellido}</td>
                                <td>{al.dni}</td>
                                <td>{al.correo}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Alumnos;