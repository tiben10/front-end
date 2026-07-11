import { useState, useEffect } from 'react';
import { rolService, funcionalidadService } from '../services/catalogoService';
import { obtenerPermisosPorRol } from '../services/permisoService';
import { useNavigate } from 'react-router-dom';
import '../Styles/Dashboard.css';
import { useTabHistory } from '../hooks/useTabHistory';
import { cambiarPassword } from '../services/usuarioService';
import { logout } from '../services/authService';

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
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('registros');
    useTabHistory(activeTab, setActiveTab);
    const [claveActual, setClaveActual] = useState('');
const [claveNueva, setClaveNueva] = useState('');
const [confirmarClave, setConfirmarClave] = useState('');
const [claveError, setClaveError] = useState('');
const [claveExito, setClaveExito] = useState(false);

const [permisosMenu, setPermisosMenu] = useState({ matricula: false, pagos: false, alumnos: false });
const [loadingPermisos, setLoadingPermisos] = useState(true);

useEffect(() => {
    const cargarPermisosMenu = async () => {
        setLoadingPermisos(true);
        try {
            const [roles, funcs] = await Promise.all([
                rolService.listar(),
                funcionalidadService.listar()
            ]);
            const rolDirector = roles.find(r => r.nombreRol?.toUpperCase() === 'DIRECTOR');
            if (!rolDirector) return;

            const permisosGuardados = await obtenerPermisosPorRol(rolDirector.idRol);

            const tienePermisoVer = (palabraClave) => {
                const func = funcs.find(f => f.nombre?.toLowerCase().includes(palabraClave));
                if (!func) return false;
                const permiso = permisosGuardados.find(
                    p => p.funcionalidad?.idFuncionalidad === func.idFuncionalidad
                );
                return !!permiso?.ver;
            };

            setPermisosMenu({
                matricula: tienePermisoVer('matric'),
                pagos: tienePermisoVer('pago'),
                alumnos: tienePermisoVer('alumno')
            });
        } catch (err) {
            console.error('Error cargando permisos del menu:', err);
        } finally {
            setLoadingPermisos(false);
        }
    };
    cargarPermisosMenu();
}, []);

const cambiarClave = async () => {
    setClaveError('');
    setClaveExito(false);

    if (!claveActual.trim() || !claveNueva.trim() || !confirmarClave.trim()) {
        setClaveError('Todos los campos son obligatorios.');
        return;
    }

    if (claveNueva.length < 8) {
            setClaveError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }

    if (claveNueva !== confirmarClave) {
        setClaveError('La nueva contraseña y la confirmación no coinciden.');
        return;
    }

    if (claveNueva === claveActual) {
        setClaveError('La nueva contraseña debe ser distinta a la actual.');
        return;
    }

    try {
        await cambiarPassword({ passwordActual: claveActual, passwordNueva: claveNueva });
        setClaveExito(true);
        setClaveActual('');
        setClaveNueva('');
        setConfirmarClave('');
    } catch (err) {
        setClaveError(
            err.response?.status === 401 || err.response?.status === 403
                ? 'La contraseña actual no es correcta.'
                : 'No se pudo conectar con el servidor.'
        );
    }
};

    const handleLogout = () => {
        logout();
        navigate('/');
    };

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
                    <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Cerrar sesión
                    </button>
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
    className={`sidebar-item ${!permisosMenu.matricula ? 'disabled' : activeTab === 'matricula' ? 'active' : ''}`}
    disabled={!permisosMenu.matricula || loadingPermisos}
    onClick={() => setActiveTab('matricula')}
    title={!permisosMenu.matricula ? 'No tienes permiso para ver esta sección' : ''}
>
    🎓 Matrícula
</button>

<button
    className={`sidebar-item ${!permisosMenu.pagos ? 'disabled' : activeTab === 'pagos' ? 'active' : ''}`}
    disabled={!permisosMenu.pagos || loadingPermisos}
    onClick={() => setActiveTab('pagos')}
    title={!permisosMenu.pagos ? 'No tienes permiso para ver esta sección' : ''}
>
    💳 Pagos
</button>

<button
    className={`sidebar-item ${!permisosMenu.alumnos ? 'disabled' : activeTab === 'alumnos' ? 'active' : ''}`}
    disabled={!permisosMenu.alumnos || loadingPermisos}
    onClick={() => setActiveTab('alumnos')}
    title={!permisosMenu.alumnos ? 'No tienes permiso para ver esta sección' : ''}
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
                        ) : activeTab === 'clave' ? (
    <main className="dash-content dash-content-full">
        <h3 className="section-title">Cambiar Clave</h3>

        <div className="perm-box" style={{ marginBottom: '1.5rem' }}>
            <p className="perm-subtitle">Mi clave (Director)</p>
            <form
                onSubmit={(e) => { e.preventDefault(); cambiarClave(); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: '360px' }}
            >
                <input
                    type="password"
                    placeholder="Contraseña actual"
                    value={claveActual}
                    onChange={(e) => setClaveActual(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
                <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={claveNueva}
                    onChange={(e) => setClaveNueva(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
                <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    value={confirmarClave}
                    onChange={(e) => setConfirmarClave(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
                <button type="submit" className="apply-btn">
                    ✓ Cambiar mi clave
                </button>
                {claveError && (
                    <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{claveError}</p>
                )}
                {claveExito && (
                    <p style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
                        ✓ Contraseña actualizada correctamente.
                    </p>
                )}
            </form>
        </div>
    </main>
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