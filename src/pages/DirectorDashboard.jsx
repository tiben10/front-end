import { useState } from 'react';
import '../Styles/Dashboard.css';

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

                <div className="dash-body">
                    <aside className="dash-sidebar">
                        <button className={`sidebar-item ${activeTab === 'registros' ? 'active' : ''}`} onClick={() => setActiveTab('registros')}>
                            📋 Registros
                        </button>

                        <button className={`sidebar-item ${activeTab === 'matricula' ? 'active' : ''}`} onClick={() => setActiveTab('matricula')}>
                            🎓 Matrícula
                        </button>

                        <button className={`sidebar-item ${activeTab === 'pagos' ? 'active' : ''}`} onClick={() => setActiveTab('pagos')}>
                            💳 Pagos
                        </button>

                        <button className={`sidebar-item ${activeTab === 'alumnos' ? 'active' : ''}`} onClick={() => setActiveTab('alumnos')}>
                            👨‍🎓 Alumnos
                        </button>

                        <button className={`sidebar-item ${activeTab === 'clave' ? 'active' : ''}`} onClick={() => setActiveTab('clave')}>
                            🔑 Mi clave
                        </button>
                    </aside>

                    <main className="dash-content">
    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1.2rem'
    }}>
        <div className="perm-box">
            <p className="perm-subtitle">Matrículas 2026</p>
            <h1>142</h1>
        </div>

        <div className="perm-box">
            <p className="perm-subtitle">Aulas registradas</p>
            <h1>8</h1>
        </div>

        <div className="perm-box">
            <p className="perm-subtitle">Pagos pendientes</p>
            <h1 style={{ color: '#991b1b' }}>23</h1>
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
            <tr>
                <td>001</td>
                <td>Chinga Ramos, Carlos</td>
                <td>Sec. 1° A</td>
                <td>10/03/2026</td>
                <td><span className="status-badge status-active">activa</span></td>
                <td>secretaria01</td>
            </tr>
            <tr>
                <td>002</td>
                <td>López Díaz, Lucía</td>
                <td>Prim. 3° B</td>
                <td>11/03/2026</td>
                <td><span className="status-badge status-active">activa</span></td>
                <td>secretaria01</td>
            </tr>
            <tr>
                <td>003</td>
                <td>Quispe Meza, Pedro</td>
                <td>Inic. 3A</td>
                <td>12/03/2026</td>
                <td><span className="matric-badge matric-pendiente">pendiente</span></td>
                <td>secretaria01</td>
            </tr>
        </tbody>
    </table>

    <div className="table-footer-note">
        👁 Vista de lectura — no se permiten modificaciones
    </div>
</main>
                </div>
            </div>
        </div>
    );
};

export default DirectorDashboard;