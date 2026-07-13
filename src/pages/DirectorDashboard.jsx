import { useState, useEffect } from 'react';
import { rolService, funcionalidadService } from '../services/catalogoService';
import { obtenerPermisosPorRol } from '../services/permisoService';
import { useNavigate } from 'react-router-dom';
import '../Styles/Dashboard.css';
import { useTabHistory } from '../hooks/useTabHistory';
import { cambiarPassword } from '../services/usuarioService';
import { logout } from '../services/authService';
import { decodeJwt } from '../services/jwt';
import { listarMatriculas } from '../services/matriculaService';
import { listarAlumnos } from '../services/alumnoService';
import { listarCuotasPago } from '../services/pagoService';
import { listarAulas } from '../services/aulaService';

const IconRegistros = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M9 12h6"></path><path d="M9 16h6"></path></svg>
);
const IconMatricula = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
);
const IconPagos = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
);
const IconAlumnos = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const IconClave = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
);




const matriculaBadgeClass = (estado) => {
    switch ((estado || '').toLowerCase()) {
        case 'activa': return 'matric-activa';
        case 'pendiente': return 'matric-pendiente';
        case 'trasladada': return 'matric-trasladada';
        default: return 'matric-activa';
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
const [currentUsername, setCurrentUsername] = useState('');

// Toma el usuario real que inicio sesion desde el token JWT
useEffect(() => {
    const token = localStorage.getItem('token');
    const claims = token ? decodeJwt(token) : null;
    if (claims?.sub) setCurrentUsername(claims.sub);
}, []);

// Datos reales para las vistas de Matrícula / Pagos / Alumnos (solo lectura)
const [matriculas, setMatriculas] = useState([]);
const [alumnosBackend, setAlumnosBackend] = useState([]);
const [aulasBackend, setAulasBackend] = useState([]);
const [cargandoDatos, setCargandoDatos] = useState(true);
const [errorDatos, setErrorDatos] = useState('');
const [busquedaAlumno, setBusquedaAlumno] = useState('');

const [codAlumnoPagos, setCodAlumnoPagos] = useState('');
const [cuotasPagos, setCuotasPagos] = useState([]);
const [cargandoCuotas, setCargandoCuotas] = useState(false);
const [errorCuotas, setErrorCuotas] = useState('');
const [cuotasPendientesAnio, setCuotasPendientesAnio] = useState(null); // conteo global, para la tarjeta de Registros

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

// Carga matrículas y alumnos reales desde el backend para las vistas de solo lectura del Director
useEffect(() => {
    let activo = true;
    const cargarDatos = async () => {
        setCargandoDatos(true);
        setErrorDatos('');
        try {
            const [matriculasBackend, alumnosData, aulasData] = await Promise.all([
                listarMatriculas(),
                listarAlumnos(),
                listarAulas()
            ]);
            if (!activo) return;
            setMatriculas(matriculasBackend);
            setAlumnosBackend(alumnosData);
            setAulasBackend(aulasData);
        } catch (err) {
            console.error('Error cargando datos del director:', err);
            if (activo) setErrorDatos('No se pudieron cargar los datos desde el servidor.');
        } finally {
            if (activo) setCargandoDatos(false);
        }
    };
    cargarDatos();
    return () => { activo = false; };
}, []);

// Consulta las cuotas del alumno seleccionado en la pestaña Pagos
useEffect(() => {
    if (!codAlumnoPagos) {
        setCuotasPagos([]);
        return;
    }
    let activo = true;
    const cargarCuotas = async () => {
        setCargandoCuotas(true);
        setErrorCuotas('');
        try {
            const data = await listarCuotasPago(codAlumnoPagos, undefined);
            if (activo) setCuotasPagos(data || []);
        } catch (err) {
            console.error('Error cargando cuotas:', err);
            if (activo) setErrorCuotas('No se pudieron cargar las cuotas de este alumno.');
        } finally {
            if (activo) setCargandoCuotas(false);
        }
    };
    cargarCuotas();
    return () => { activo = false; };
}, [codAlumnoPagos]);

// Cuenta las cuotas pendientes del año vigente en TODO el colegio, para la tarjeta de Registros
useEffect(() => {
    let activo = true;
    listarCuotasPago(undefined, undefined)
        .then((data) => {
            if (!activo) return;
            const pendientesAnioVigente = (data || []).filter(
                (c) => c.matricula?.anioAcademico?.anio === ANIO_VIGENTE && (c.estado || '').toUpperCase() === 'PENDIENTE'
            );
            setCuotasPendientesAnio(pendientesAnioVigente.length);
        })
        .catch((err) => {
            console.error('Error contando cuotas pendientes:', err);
            if (activo) setCuotasPendientesAnio(null);
        });
    return () => { activo = false; };
}, []);

// Nivel/grado vigente de cada alumno, según su matrícula activa más reciente
const nivelGradoPorAlumno = {};
matriculas.forEach((m) => {
    if ((m.estado || '').toLowerCase() !== 'activa') return;
    const codAlumno = m.alumno?.codAlumno;
    if (!codAlumno) return;
    nivelGradoPorAlumno[codAlumno] = {
        nivel: m.aula?.nivel?.nombre || '',
        grado: m.aula?.grado?.nombre ? `${m.aula.grado.nombre} ${m.aula.seccion || ''}`.trim() : ''
    };
});

const alumnosMapeados = alumnosBackend.map((al) => ({
    id: al.codAlumno,
    codigo: `AL${String(al.codAlumno).padStart(4, '0')}`,
    documento: al.numeroDocumento,
    tipoDoc: al.tipoDocumento?.nombre || '',
    nombreCompleto: `${al.apellidoPaterno || ''} ${al.apellidoMaterno || ''}, ${al.nombres || ''}`.trim(),
    nivel: nivelGradoPorAlumno[al.codAlumno]?.nivel || 'Sin matrícula',
    grado: nivelGradoPorAlumno[al.codAlumno]?.grado || '',
    estado: al.estado ? 'activo' : 'inactivo'
}));

const alumnosFiltrados = alumnosMapeados.filter((a) => {
    const texto = `${a.codigo} ${a.nombreCompleto} ${a.documento}`.toLowerCase();
    return texto.includes(busquedaAlumno.toLowerCase());
});

const matriculasOrdenadas = matriculas
    .slice()
    .sort((a, b) => (b.codMatricula || 0) - (a.codMatricula || 0));
    // ===== Datos reales para el resumen de "Registros" =====
const ANIO_VIGENTE = '2026'; // año académico que se muestra en el resumen

const matriculasDelAnioActivas = matriculas.filter(
    (m) => String(m.anioAcademico?.anio) === ANIO_VIGENTE && (m.estado || '').toLowerCase() === 'activa'
);

const aulasActivas = aulasBackend.filter((a) => a.estado);

const matriculasParaResumen = matriculasOrdenadas.slice(0, 5);

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
                        <span className="user-name">{currentUsername || 'director'}</span>
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
                            <IconRegistros /> Registros
                        </button>

                        <button
    className={`sidebar-item ${!permisosMenu.matricula ? 'disabled' : activeTab === 'matricula' ? 'active' : ''}`}
    disabled={!permisosMenu.matricula || loadingPermisos}
    onClick={() => setActiveTab('matricula')}
    title={!permisosMenu.matricula ? 'No tienes permiso para ver esta sección' : ''}
>
    <IconMatricula /> Matrícula
</button>

<button
    className={`sidebar-item ${!permisosMenu.pagos ? 'disabled' : activeTab === 'pagos' ? 'active' : ''}`}
    disabled={!permisosMenu.pagos || loadingPermisos}
    onClick={() => setActiveTab('pagos')}
    title={!permisosMenu.pagos ? 'No tienes permiso para ver esta sección' : ''}
>
    <IconPagos /> Pagos
</button>

<button
    className={`sidebar-item ${!permisosMenu.alumnos ? 'disabled' : activeTab === 'alumnos' ? 'active' : ''}`}
    disabled={!permisosMenu.alumnos || loadingPermisos}
    onClick={() => setActiveTab('alumnos')}
    title={!permisosMenu.alumnos ? 'No tienes permiso para ver esta sección' : ''}
>
    <IconAlumnos /> Alumnos
</button>
                        <button
                            className={`sidebar-item ${activeTab === 'clave' ? 'active' : ''}`}
                            onClick={() => setActiveTab('clave')}
                        >
                            <IconClave /> Mi clave
                        </button>

                    </aside>

                    <main className="dash-content">
                        {activeTab === 'registros' ? (
                            <>
                                <div className="director-summary-grid">
                                    <div className="director-summary-card">
                                        <p>Matrículas {ANIO_VIGENTE}</p>
                <h1>{cargandoDatos ? '—' : matriculasDelAnioActivas.length}</h1>
            </div>

                                    <div className="director-summary-card">
                                        <p>Aulas registradas</p>
                <h1>{cargandoDatos ? '—' : aulasActivas.length}</h1>
                                    </div>

                                    <div className="director-summary-card">
                                        <p>Pagos pendientes</p>
                <h1 className="director-danger-number">{cuotasPendientesAnio === null ? '—' : cuotasPendientesAnio}</h1>
                                    </div>
                                </div>

                                <h3 className="section-title">Matrículas recientes — {ANIO_VIGENTE}</h3>
                                {cargandoDatos ? (
            <p>Cargando matrículas...</p>
        ) : errorDatos ? (
            <p style={{ color: '#dc2626' }}>{errorDatos}</p>
        ) : (
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
                                        {matriculasParaResumen.map((m) => (
                        <tr key={m.codMatricula}>
                            <td>{m.codMatricula}</td>
                            <td>{m.alumno?.apellidoPaterno} {m.alumno?.apellidoMaterno}, {m.alumno?.nombres}</td>
                            <td>{m.aula?.nivel?.nombre} {m.aula?.grado?.nombre} "{m.aula?.seccion}"</td>
                            <td>{m.fechaMatricula}</td>
                            <td>
                                                    <span className={`matric-badge ${matriculaBadgeClass(m.estado)}`}>
                                                        {m.estado}
                                                    </span>
                                                </td>
                                                <td>{m.usuarioRegistro?.usuario || '—'}</td>
                                            </tr>
                                        ))}
                                        {matriculasParaResumen.length === 0 && (
                        <tr><td colSpan="6" className="table-footer-note">No hay matrículas registradas.</td></tr>
                    )}
                                    </tbody>
                                </table>
        )}
                                <div className="table-footer-note">
                                    👁 Vista de lectura — no se permiten modificaciones
                                </div>
                            </>
                        ) : activeTab === 'matricula' ? (
    <main className="dash-content dash-content-full">
        <h3 className="section-title">Matrículas registradas</h3>
        <p className="table-footer-note" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
            Listado completo de matrículas del sistema.
        </p>

        {cargandoDatos ? (
            <p>Cargando matrículas...</p>
        ) : errorDatos ? (
            <p style={{ color: '#dc2626' }}>{errorDatos}</p>
        ) : (
            <table className="users-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Alumno</th>
                        <th>Aula</th>
                        <th>Año</th>
                        <th>Fecha matrícula</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {matriculasOrdenadas.map((m) => (
                        <tr key={m.codMatricula}>
                            <td>{m.codMatricula}</td>
                            <td>{m.alumno?.apellidoPaterno} {m.alumno?.apellidoMaterno}, {m.alumno?.nombres}</td>
                            <td>{m.aula?.nivel?.nombre} {m.aula?.grado?.nombre} {m.aula?.seccion}</td>
                            <td>{m.anioAcademico?.anio}</td>
                            <td>{m.fechaMatricula}</td>
                            <td>
                                <span className={`matric-badge ${matriculaBadgeClass(m.estado)}`}>
                                    {m.estado}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {matriculasOrdenadas.length === 0 && (
                        <tr><td colSpan="6" className="table-footer-note">No hay matrículas registradas.</td></tr>
                    )}
                </tbody>
            </table>
        )}

        <div className="table-footer-note">
            👁 Mostrando {matriculasOrdenadas.length} matrícula(s) — vista de lectura, no se permiten modificaciones
        </div>
    </main>
                        ) : activeTab === 'pagos' ? (
    <main className="dash-content dash-content-full">
        <h3 className="section-title">Consulta de pagos</h3>
        <p className="table-footer-note" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
            Selecciona un alumno para revisar el estado de sus cuotas.
        </p>

        <div className="field-group" style={{ maxWidth: '420px' }}>
            <label className="field-label">Alumno</label>
            <select
                className="filter-select"
                style={{ width: '100%' }}
                value={codAlumnoPagos}
                onChange={(e) => setCodAlumnoPagos(e.target.value)}
            >
                <option value="">Selecciona un alumno...</option>
                {alumnosMapeados.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombreCompleto} — {a.codigo}</option>
                ))}
            </select>
        </div>

        {!codAlumnoPagos ? (
            <div className="empty-aula-detail" style={{ marginTop: '1rem' }}>
                👈 Selecciona un alumno con el selector de arriba para ver sus cuotas.
            </div>
        ) : cargandoCuotas ? (
            <p style={{ marginTop: '1rem' }}>Cargando cuotas...</p>
        ) : errorCuotas ? (
            <p style={{ color: '#dc2626', marginTop: '1rem' }}>{errorCuotas}</p>
        ) : (
            <>
                {(() => {
                    const cuotasOrdenadas = [...cuotasPagos].sort((a, b) => {
                        const anioA = a.matricula?.anioAcademico?.anio || '';
                        const anioB = b.matricula?.anioAcademico?.anio || '';
                        if (anioA !== anioB) return anioB.localeCompare(anioA);
                        return (a.concepto?.ordenPago || 0) - (b.concepto?.ordenPago || 0);
                    });
                    const pendientesAnioAnterior = cuotasOrdenadas.filter((c) => {
                        const anio = c.matricula?.anioAcademico?.anio;
                        return anio && anio !== ANIO_VIGENTE && (c.estado || '').toUpperCase() === 'PENDIENTE';
                    });

                    return (
                        <>
                            {pendientesAnioAnterior.length > 0 && (
                                <div className="warning-banner" style={{ marginBottom: '0.75rem' }}>
                                    ⚠ Este alumno tiene {pendientesAnioAnterior.length} cuota(s) pendiente(s) de año(s) anterior(es) — no son del año {ANIO_VIGENTE}.
                                </div>
                            )}
                            <table className="pagos-table" style={{ marginTop: '1rem' }}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Año</th>
                                        <th>Concepto</th>
                                        <th>Monto</th>
                                        <th>Estado</th>
                                        <th>Fecha de pago</th>
                                        <th>Recibo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cuotasOrdenadas.map((cuota, index) => (
                                        <tr key={cuota.codCuota}>
                                            <td>{index + 1}</td>
                                            <td>
                                                {cuota.matricula?.anioAcademico?.anio}
                                                {cuota.matricula?.anioAcademico?.anio !== ANIO_VIGENTE && (
                                                    <span className="table-footer-note" style={{ marginLeft: '0.35rem' }}>(anterior)</span>
                                                )}
                                            </td>
                                            <td>{cuota.concepto?.nombreConcepto}</td>
                                            <td>S/ {cuota.montoCobrado}</td>
                                            <td>
                                                {(cuota.estado || '').toUpperCase() === 'PAGADO' ? (
                                                    <span className="estado-pagado-pill">pagado</span>
                                                ) : (
                                                    <span className="estado-deuda-pill">pendiente</span>
                                                )}
                                            </td>
                                            <td>{cuota.fechaPago ? new Date(cuota.fechaPago).toLocaleDateString() : '—'}</td>
                                            <td>{cuota.recibo || '—'}</td>
                                        </tr>
                                    ))}
                                    {cuotasOrdenadas.length === 0 && (
                                        <tr><td colSpan="7" className="table-footer-note">Este alumno no tiene cuotas registradas.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </>
                    );
                })()}

                <div className="table-footer-note">
                    👁 Vista de lectura — el Director no puede procesar pagos desde este panel.
                </div>
            </>
        )}
    </main>
                        ) : activeTab === 'alumnos' ? (
    <main className="dash-content dash-content-full">
        <h3 className="section-title">Alumnos registrados</h3>

        <input
            type="text"
            className="readonly-input"
            placeholder="Buscar por código, nombre o documento..."
            value={busquedaAlumno}
            onChange={(e) => setBusquedaAlumno(e.target.value)}
            style={{ marginBottom: '1rem', maxWidth: '420px' }}
        />

        {cargandoDatos ? (
            <p>Cargando alumnos...</p>
        ) : errorDatos ? (
            <p style={{ color: '#dc2626' }}>{errorDatos}</p>
        ) : (
            <table className="users-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Código</th>
                        <th>Alumno</th>
                        <th>Documento</th>
                        <th>Nivel / Aula</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {alumnosFiltrados.map((alumno, index) => (
                        <tr key={alumno.id}>
                            <td>{index + 1}</td>
                            <td>{alumno.codigo}</td>
                            <td>{alumno.nombreCompleto}</td>
                            <td>{alumno.tipoDoc} {alumno.documento}</td>
                            <td>{alumno.nivel} {alumno.grado}</td>
                            <td>
                                <span className={`status-badge ${alumno.estado === 'activo' ? 'status-active' : 'status-deleted'}`}>
                                    {alumno.estado}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {alumnosFiltrados.length === 0 && (
                        <tr><td colSpan="6" className="table-footer-note">No se encontraron alumnos.</td></tr>
                    )}
                </tbody>
            </table>
        )}

        <p className="table-footer-note">
            Mostrando {alumnosFiltrados.length} alumno(s) — vista de lectura, no se permiten modificaciones.
        </p>
    </main>
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
