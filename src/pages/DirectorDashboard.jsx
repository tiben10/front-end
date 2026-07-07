import { useState } from 'react';
import '../Styles/Dashboard.css';
const matriculasRecientes = [
    { id: '001', alumno: 'Chinga Ramos, Carlos', aula: 'Sec. 1° A', fecha: '10/03/2026', estado: 'activa', registradoPor: 'secretaria01' },
    { id: '002', alumno: 'López Díaz, Lucía', aula: 'Prim. 3° B', fecha: '11/03/2026', estado: 'activa', registradoPor: 'secretaria01' },
    { id: '003', alumno: 'Quispe Meza, Pedro', aula: 'Inic. 3A', fecha: '12/03/2026', estado: 'pendiente', registradoPor: 'secretaria01' }
];

const estadoMatriculaClass = (estado) => {
    switch (estado) {
        case 'activa': return 'matric-activa';
        case 'pendiente': return 'matric-pendiente';
        default: return 'matric-trasladada';
    }
};
const DirectorDashboard = () => {
    const [activeTab, setActiveTab] = useState('registros');

    return (
        <div className="dash-wrapper">
            <div className="dash-title-top">DIRECTOR — CONSULTA DE REGISTROS</div>

            <div className="dash-container">
                <header className="dash-header">
                    <div className="dash-header-left">
                        <h2>Panel Director</h2>
                    </div>

                    <div className="dash-header-right">
                        <span className="badge-su" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>DI</span>
                        <span className="user-name">Juan Ríos</span>
                        <span className="role-badge role-di">solo lectura</span>
                    </div>
                </header>
                <div className="dash-body director-body">
                    <aside className="dash-sidebar">

                        <button
                            className={`sidebar-item ${activeTab === 'registros' ? 'active' : ''}`}
                            onClick={() => setActiveTab('registros')}
                        >
                            📋 Registros
                        </button>

                        <button
                            className="sidebar-item disabled"
                            disabled
                        >
                            🎓 Matrícula
                        </button>

                        <button
                            className="sidebar-item disabled"
                            disabled
                        >
                            💳 Pagos
                        </button>

                        <button
                            className="sidebar-item disabled"
                            disabled
                        >
                            👨‍🎓 Alumnos
                        </button>

                        <button
                            className={`sidebar-item ${activeTab === 'clave' ? 'active' : ''}`}
                            onClick={() => setActiveTab('clave')}
                        >
                            🔑 Mi clave
                        </button>

                    </aside>

                    <main className="dash-content">
                        {activeTab === 'registros' ? (
                            <>
                                <div className="director-summary-grid">
                                    <div className="director-summary-card">
                                        <p>Matrículas 2026</p>
                                        <h1>142</h1>
                                    </div>

                                    <div className="director-summary-card">
                                        <p>Aulas registradas</p>
                                        <h1>8</h1>
                                    </div>

                                    <div className="director-summary-card">
                                        <p>Pagos pendientes</p>
                                        <h1 className="director-danger-number">23</h1>
                                    </div>
                                </div>

                                <h3 className="section-title">Matrículas recientes — 2026</h3>

                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Alumno</th>
                                            <th>Aula</th>
                                            <th>Fecha</th>
                                            <th>Estado</th>
                                            <th>Reg. por</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {matriculasRecientes.map((matricula) => (
                                            <tr key={matricula.id}>
                                                <td>{matricula.id}</td>
                                                <td>{matricula.alumno}</td>
                                                <td>{matricula.aula}</td>
                                                <td>{matricula.fecha}</td>
                                                <td>
                                                    <span className={`matric-badge ${estadoMatriculaClass(matricula.estado)}`}>
                                                        {matricula.estado}
                                                    </span>
                                                </td>
                                                <td>{matricula.registradoPor}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="table-footer-note">
                                    👁 Vista de lectura — no se permiten modificaciones
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="section-title">Próximamente</h3>
                                <p>Esta sección ({activeTab}) se implementará más adelante.</p>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DirectorDashboard;