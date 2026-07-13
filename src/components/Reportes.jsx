import { useState, useEffect } from 'react';
import { listarAulas } from '../services/aulaService';
import { listarMatriculas } from '../services/matriculaService';
// ============================================================================
// Reportes.jsx
// ----------------------------------------------------------------------------
// Modulo de Reportes (Vacantes / Matricula / Deudas / Caja), reutilizable entre
// paneles (Superusuario, Secretaria, y a futuro Director). Es autocontenido:
// trae sus propios datos simulados, su propio estado (pestana activa, filtros)
// y su propia logica de exportacion a CSV. Los dashboards que lo usan solo
// necesitan renderizar <Reportes /> dentro de su pestana "Reportes".
// ============================================================================

const REPORTES_MENU = [
    { key: 'matricula', label: 'Reporte de Matrícula' },
    { key: 'vacantes', label: 'Reporte de Vacantes' },
    { key: 'deudas', label: 'Reporte de Deudas' },
    { key: 'caja', label: 'Reporte de Caja' }
];



const MOCK_MATRICULA = [
    { aula: 'A', nivel: 'Inicial', grado: '3 años', matriculados: 20, cupoMax: 25 },
    { aula: 'B', nivel: 'Inicial', grado: '3 años', matriculados: 18, cupoMax: 25 },
    { aula: 'A', nivel: 'Primaria', grado: '1°', matriculados: 30, cupoMax: 35 },
    { aula: 'A', nivel: 'Secundaria', grado: '1°', matriculados: 35, cupoMax: 35 }
];

const MOCK_DEUDAS = [
    { alumno: 'Chinga Ramos, Carlos', doc: '75412638', concepto: 'Marzo 2026', monto: 100, vencimiento: '15/04/2026', diasAtraso: 85, estado: 'Pendiente' },
    { alumno: 'Chinga Ramos, Carlos', doc: '75412638', concepto: 'Abril 2026', monto: 100, vencimiento: '15/05/2026', diasAtraso: 55, estado: 'Bloqueado' },
    { alumno: 'López Díaz, Lucía', doc: '47112233', concepto: 'Abril 2026', monto: 100, vencimiento: '15/05/2026', diasAtraso: 55, estado: 'Pendiente' },
    { alumno: 'Quispe Meza, Pedro', doc: '52009871', concepto: 'Marzo 2026', monto: 100, vencimiento: '15/04/2026', diasAtraso: 85, estado: 'Pendiente' }
];

const MOCK_CAJA_INGRESOS = [
    { mes: 'Enero', concepto: 'Matrículas', cantPagos: 15, total: 3000 },
    { mes: 'Febrero', concepto: 'Matrículas', cantPagos: 22, total: 4400 },
    { mes: 'Marzo', concepto: 'Cuotas mensuales', cantPagos: 18, total: 1800 },
    { mes: 'Abril', concepto: 'Cuotas mensuales', cantPagos: 12, total: 1200 },
    { mes: 'Mayo', concepto: 'Cuotas mensuales', cantPagos: 10, total: 1000 },
    { mes: 'Junio', concepto: 'Cuotas mensuales', cantPagos: 8, total: 800 }
];

const formatSoles = (n) => `S/ ${n.toLocaleString('es-PE')}`;

const getEstadoVacante = (ocupados, cupo) => {
    const vacantes = cupo - ocupados;
    if (vacantes <= 0) return { label: 'Llena', className: 'estado-llena', color: '#b91c1c' };
    if (ocupados / cupo >= 0.85) return { label: 'Casi llena', className: 'estado-casi', color: '#b45309' };
    return { label: 'Disponible', className: 'estado-disponible', color: '#15803d' };
};

const descargarCSV = (nombreArchivo, encabezado, filas) => {
    const csv = [encabezado.join(','), ...filas.map(f => f.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(url);
};

const Reportes = () => {
    
    const [reporteActivo, setReporteActivo] = useState('vacantes');
    const [anioReporte, setAnioReporte] = useState('2026');
    const [nivelFiltro, setNivelFiltro] = useState('todos');
    const [estadoDeudaFiltro, setEstadoDeudaFiltro] = useState('todos');
    const [mesCajaFiltro, setMesCajaFiltro] = useState('todos');

    // ===== Datos reales para el reporte de Vacantes (aulas + matrículas) =====
    const [aulasBackend, setAulasBackend] = useState([]);
    const [matriculasBackend, setMatriculasBackend] = useState([]);
    const [cargandoVacantes, setCargandoVacantes] = useState(true);
    const [errorVacantes, setErrorVacantes] = useState('');

    useEffect(() => {
        let activo = true;
        const cargarDatosVacantes = async () => {
            setCargandoVacantes(true);
            setErrorVacantes('');
            try {
                const [aulas, matriculas] = await Promise.all([listarAulas(), listarMatriculas()]);
                if (!activo) return;
                setAulasBackend(aulas);
                setMatriculasBackend(matriculas);
            } catch (err) {
                console.error('Error cargando datos de vacantes', err);
                if (activo) setErrorVacantes('No se pudieron cargar los datos de vacantes desde el servidor.');
            } finally {
                if (activo) setCargandoVacantes(false);
            }
        };
        cargarDatosVacantes();
        return () => { activo = false; };
    }, []);

    // Cuántos alumnos con matrícula activa tiene cada aula
    const ocupadasPorAula = {};
    matriculasBackend.forEach((m) => {
        if ((m.estado || '').toLowerCase() === 'activa' && m.aula?.codAula) {
            ocupadasPorAula[m.aula.codAula] = (ocupadasPorAula[m.aula.codAula] || 0) + 1;
        }
    });

    // Aulas activas del año seleccionado, con su ocupación real
    const vacantesDelAnio = aulasBackend
        .filter((a) => a.estado && String(a.anioAcademico?.anio) === anioReporte)
        .map((a) => ({
            aula: a.codAula,
            nivel: a.nivel?.nombre || '',
            grado: a.grado?.nombre || '',
            seccion: a.seccion,
            ocupados: ocupadasPorAula[a.codAula] || 0,
            cupo: a.capacidadMaxima
        }));

    const matriculaFiltrada = nivelFiltro === 'todos' ? MOCK_MATRICULA : MOCK_MATRICULA.filter(m => m.nivel === nivelFiltro);
    const deudasFiltradas = estadoDeudaFiltro === 'todos' ? MOCK_DEUDAS : MOCK_DEUDAS.filter(d => d.estado === estadoDeudaFiltro);
    const cajaFiltrada = mesCajaFiltro === 'todos' ? MOCK_CAJA_INGRESOS : MOCK_CAJA_INGRESOS.filter(c => c.mes === mesCajaFiltro);
    const cajaTotalIngresos = cajaFiltrada.reduce((acc, c) => acc + c.total, 0);
    const cajaTotalPagos = cajaFiltrada.reduce((acc, c) => acc + c.cantPagos, 0);
    const cajaPromedioPorPago = cajaTotalPagos > 0 ? Math.round(cajaTotalIngresos / cajaTotalPagos) : 0;

    const exportarVacantesCSV = () => {
        const filas = vacantesDelAnio.map(v => {
            const vacantes = v.cupo - v.ocupados;
            const estado = getEstadoVacante(v.ocupados, v.cupo);
            return [v.aula, v.nivel, v.grado, v.seccion, v.ocupados, v.cupo, vacantes, estado.label];
        });
        descargarCSV(`reporte-vacantes-${anioReporte}.csv`, ['Aula', 'Nivel', 'Grado', 'Sección', 'Ocupados', 'Cupo', 'Vacantes', 'Estado'], filas);
    };

    const exportarMatriculaCSV = () => {
        const filas = matriculaFiltrada.map(m => {
            const pct = Math.round((m.matriculados / m.cupoMax) * 100);
            return [m.aula, m.nivel, m.grado, m.matriculados, m.cupoMax, `${pct}%`];
        });
        descargarCSV(`reporte-matricula-${anioReporte}.csv`, ['Aula', 'Nivel', 'Grado', 'Matriculados', 'Cupo Máximo', '% Ocupación'], filas);
    };

    const exportarDeudasCSV = () => {
        const filas = deudasFiltradas.map(d => [d.alumno, d.doc, d.concepto, d.monto, d.vencimiento, d.diasAtraso, d.estado]);
        descargarCSV(`reporte-deudas-${anioReporte}.csv`, ['Alumno', 'Documento', 'Concepto', 'Monto', 'Vencimiento', 'Días de Atraso', 'Estado'], filas);
    };

    const exportarCajaCSV = () => {
        const filas = cajaFiltrada.map(c => [c.mes, c.concepto, c.cantPagos, c.total]);
        descargarCSV(`reporte-caja-${mesCajaFiltro === 'todos' ? anioReporte : mesCajaFiltro}.csv`, ['Mes', 'Concepto', 'Cantidad de Pagos', 'Total (S/)'], filas);
    };

    return (
        <>
            <h3 className="section-title" style={{ marginBottom: '1rem' }}>Reportes</h3>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                <nav className="reportes-menu">
                    {REPORTES_MENU.map(r => (
                        <button
                            key={r.key}
                            type="button"
                            className={`reportes-menu-item ${reporteActivo === r.key ? 'active' : ''}`}
                            onClick={() => setReporteActivo(r.key)}
                        >
                            {r.key === 'matricula' && (
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                            )}
                            {r.key === 'vacantes' && (
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                            )}
                            {r.key === 'deudas' && (
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            )}
                            {r.key === 'caja' && (
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            )}
                            <span>{r.label}</span>
                        </button>
                    ))}
                </nav>

                <div style={{ flex: 1, minWidth: 0 }}>
                    {reporteActivo === 'vacantes' ? (
                        <>
                            <div className="perm-box" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                <div className="filter-group">
                                    <label>Año académico</label>
                                    <select className="filter-select" value={anioReporte} onChange={(e) => setAnioReporte(e.target.value)}>
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                    </select>
                                </div>
                                <button type="button" className="pagar-btn-solid" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={exportarVacantesCSV}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Exportar CSV
                                </button>
                            </div>

                            <div className="perm-box">
                                <p className="perm-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                                    Vacantes disponibles — {anioReporte}
                                </p>

                                {cargandoVacantes ? (
                                    <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Cargando vacantes...</p>
                                ) : errorVacantes ? (
                                    <p style={{ color: '#dc2626' }}>{errorVacantes}</p>
                                ) : (
                                    <>
                                        <table className="users-table">
                                            <thead>
                                                <tr>
                                                    <th>Aula</th><th>Nivel</th><th>Grado</th><th>Sección</th>
                                                    <th>Ocupados</th><th>Cupo</th><th>Vacantes</th><th>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {vacantesDelAnio.map(v => {
                                                    const vacantes = v.cupo - v.ocupados;
                                                    const estado = getEstadoVacante(v.ocupados, v.cupo);
                                                    return (
                                                        <tr key={v.aula}>
                                                            <td>{v.aula}</td>
                                                            <td>{v.nivel}</td>
                                                            <td>{v.grado}</td>
                                                            <td>{v.seccion}</td>
                                                            <td>{v.ocupados}</td>
                                                            <td>{v.cupo}</td>
                                                            <td style={{ fontWeight: 800, color: estado.color }}>{vacantes}</td>
                                                            <td><span className={`estado-badge ${estado.className}`}>{estado.label}</span></td>
                                                        </tr>
                                                    );
                                                })}
                                                {vacantesDelAnio.length === 0 && (
                                                    <tr><td colSpan="8" className="table-footer-note">No hay aulas registradas para el año {anioReporte}.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                        <p className="table-footer-note">
                                            ⓘ Total vacantes: <strong>{vacantesDelAnio.reduce((acc, v) => acc + (v.cupo - v.ocupados), 0)}</strong>. Se recomienda abrir nuevas secciones si la demanda supera el 90% de ocupación.
                                        </p>
                                    </>
                                )}
                            </div>
                        </>
                    ) : reporteActivo === 'matricula' ? (
                        <>
                            <div className="perm-box" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                <div className="filter-group">
                                    <label>Año académico</label>
                                    <select className="filter-select" value={anioReporte} onChange={(e) => setAnioReporte(e.target.value)}>
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label>Nivel</label>
                                    <select className="filter-select" value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)}>
                                        <option value="todos">Todos</option>
                                        <option value="Inicial">Inicial</option>
                                        <option value="Primaria">Primaria</option>
                                        <option value="Secundaria">Secundaria</option>
                                    </select>
                                </div>
                                <button type="button" className="pagar-btn-solid" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={exportarMatriculaCSV}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Exportar CSV
                                </button>
                            </div>

                            <div className="perm-box">
                                <p className="perm-subtitle">Reporte de Matrículas — {anioReporte}</p>
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>#</th><th>Aula</th><th>Nivel</th><th>Grado</th>
                                            <th>Matriculados</th><th>Cupo máx.</th><th>% Ocupación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matriculaFiltrada.map((m, idx) => {
                                            const pct = Math.round((m.matriculados / m.cupoMax) * 100);
                                            return (
                                                <tr key={idx}>
                                                    <td>{idx + 1}</td>
                                                    <td>{m.aula}</td>
                                                    <td>{m.nivel}</td>
                                                    <td>{m.grado}</td>
                                                    <td>{m.matriculados}</td>
                                                    <td>{m.cupoMax}</td>
                                                    <td>
                                                        <div className="cupo-cell">
                                                            <span className="cupo-fraction">{pct}%</span>
                                                            <div className="cupo-bar-track">
                                                                <div
                                                                    className={`cupo-bar-fill ${pct >= 100 ? 'fill-red' : pct >= 85 ? 'fill-amber' : 'fill-green'}`}
                                                                    style={{ width: `${Math.min(100, pct)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <p className="table-footer-note">
                                    ⓘ Total matriculados {anioReporte}: <strong>{matriculaFiltrada.reduce((acc, m) => acc + m.matriculados, 0)}</strong> alumnos.
                                </p>
                            </div>
                        </>
                    ) : reporteActivo === 'deudas' ? (
                        <>
                            <div className="perm-box" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                <div className="filter-group">
                                    <label>Año académico</label>
                                    <select className="filter-select" value={anioReporte} onChange={(e) => setAnioReporte(e.target.value)}>
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label>Estado</label>
                                    <select className="filter-select" value={estadoDeudaFiltro} onChange={(e) => setEstadoDeudaFiltro(e.target.value)}>
                                        <option value="todos">Todos</option>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Bloqueado">Bloqueado</option>
                                    </select>
                                </div>
                                <button type="button" className="pagar-btn-solid" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={exportarDeudasCSV}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Exportar CSV
                                </button>
                            </div>

                            <div className="perm-box">
                                <p className="perm-subtitle">Reporte de Deudas — {anioReporte}</p>
                                <table className="pagos-table">
                                    <thead>
                                        <tr>
                                            <th>Alumno</th><th>Documento</th><th>Concepto</th><th>Monto</th>
                                            <th>Vencimiento</th><th>Días atraso</th><th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deudasFiltradas.map((d, idx) => (
                                            <tr key={idx} className={d.estado === 'Bloqueado' ? 'pagos-row-bloqueado' : 'pagos-row-deuda'}>
                                                <td>{d.alumno}</td>
                                                <td>{d.doc}</td>
                                                <td>{d.concepto}</td>
                                                <td>{formatSoles(d.monto)}</td>
                                                <td>{d.vencimiento}</td>
                                                <td>{d.diasAtraso} días</td>
                                                <td>
                                                    {d.estado === 'Bloqueado' ? (
                                                        <span className="estado-bloqueado-pill">bloqueado</span>
                                                    ) : (
                                                        <span className="estado-deuda-pill">pendiente</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="table-footer-note">
                                    ⓘ Deuda total: <strong>{formatSoles(deudasFiltradas.reduce((acc, d) => acc + d.monto, 0))}</strong> — {new Set(deudasFiltradas.map(d => d.alumno)).size} alumno(s) con deuda.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="perm-box" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                <div className="filter-group">
                                    <label>Mes</label>
                                    <select className="filter-select" value={mesCajaFiltro} onChange={(e) => setMesCajaFiltro(e.target.value)}>
                                        <option value="todos">Todos</option>
                                        {MOCK_CAJA_INGRESOS.map(c => (
                                            <option key={c.mes} value={c.mes}>{c.mes}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="button" className="pagar-btn-solid" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={exportarCajaCSV}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Exportar CSV
                                </button>
                            </div>

                            <div className="director-summary-grid" style={{ marginBottom: '1.25rem' }}>
                                <div className="director-summary-card">
                                    <p>Total ingresos</p>
                                    <h1>{formatSoles(cajaTotalIngresos)}</h1>
                                </div>
                                <div className="director-summary-card">
                                    <p>Cantidad de pagos</p>
                                    <h1>{cajaTotalPagos}</h1>
                                </div>
                                <div className="director-summary-card">
                                    <p>Promedio por pago</p>
                                    <h1>{formatSoles(cajaPromedioPorPago)}</h1>
                                </div>
                            </div>

                            <div className="perm-box">
                                <p className="perm-subtitle">Ingresos por mes</p>
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Mes</th><th>Concepto</th><th>Cant. pagos</th><th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cajaFiltrada.map((c, idx) => (
                                            <tr key={idx}>
                                                <td>{c.mes}</td>
                                                <td>{c.concepto}</td>
                                                <td>{c.cantPagos}</td>
                                                <td>{formatSoles(c.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default Reportes;
