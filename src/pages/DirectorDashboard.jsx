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
                        <h3 className="section-title">Vista principal del Director</h3>
                        <p>
                            Panel de consulta para revisar información académica del sistema de matrículas.
                        </p>
                        <p className="table-footer-note">
                            El Director tiene acceso de solo lectura, sin acciones de crear, editar o eliminar.
                        </p>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DirectorDashboard;