import { useState, useEffect } from 'react';
import { listarAulas } from '../services/aulaService';
import { listarMatriculas } from '../services/matriculaService';
import { anioAcademicoService } from '../services/catalogoService';
import { listarDeudas } from '../services/deudaService';
import { reportePagos } from '../services/reporteService';

const REPORTES_MENU = [
    { key: 'matricula', label: 'Reporte de Matrícula' },
    { key: 'vacantes', label: 'Reporte de Vacantes' },
    { key: 'deudas', label: 'Reporte de Deudas' },
    { key: 'caja', label: 'Reporte de Caja' }
];

const MESES = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
];



const formatSoles = (n) =>
    `S/ ${Number(n || 0).toLocaleString('es-PE')}`;

const getEstadoVacante = (ocupados, cupo) => {
    const vacantes = cupo - ocupados;
    if (vacantes <= 0) return { label: 'Llena', className: 'estado-llena', color: '#b91c1c' };
    if (ocupados / cupo >= 0.85) return { label: 'Casi llena', className: 'estado-casi', color: '#b45309' };
    return { label: 'Disponible', className: 'estado-disponible', color: '#15803d' };
};
const getEstadoDeuda = (estado) => {
    switch ((estado || '').toUpperCase()) {
        case 'AL_DIA':
            return {
                label: 'al día',
                className: 'status-badge status-active'
            };

        case 'PENDIENTE':
            return {
                label: 'pendiente',
                className: 'estado-deuda-pill'
            };

        case 'VENCIDA':
            return {
                label: 'vencida',
                className: 'estado-bloqueado-pill'
            };

        default:
            return {
                label: (estado || '').toLowerCase(),
                className: 'status-badge'
            };
    }
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

    

    const [aniosCatalogo, setAniosCatalogo] = useState([]);
    useEffect(() => {
        anioAcademicoService.listar()
            .then((data) => setAniosCatalogo(data.filter(a => a.estado)))
            .catch((err) => console.error('Error cargando años académicos', err));
    }, []);
    const codAnioReporte = aniosCatalogo.find(a => String(a.anio) === anioReporte)?.codAnioAcademico;



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


    const ocupadasPorAula = {};
    matriculasBackend.forEach((m) => {
        if ((m.estado || '').toLowerCase() === 'activa' && m.aula?.codAula) {
            ocupadasPorAula[m.aula.codAula] = (ocupadasPorAula[m.aula.codAula] || 0) + 1;
        }
    });

   
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
          const matriculaDelAnio = aulasBackend
        .filter((a) => a.estado && String(a.anioAcademico?.anio) === anioReporte)
        .filter((a) => nivelFiltro === 'todos' || a.nivel?.nombre === nivelFiltro)
        .map((a) => ({
            aula: a.codAula,
            nivel: a.nivel?.nombre || '',
            grado: a.grado?.nombre || '',
            matriculados: ocupadasPorAula[a.codAula] || 0,
            cupoMax: a.capacidadMaxima
        }));

       
const [deudasBackend, setDeudasBackend] = useState([]);
const [cargandoDeudas, setCargandoDeudas] = useState(false);
const [errorDeudas, setErrorDeudas] = useState('');

useEffect(() => {
    if (reporteActivo !== 'deudas' || !codAnioReporte) return;

    let activo = true;

    const cargarDeudas = async () => {
        setCargandoDeudas(true);
        setErrorDeudas('');

        try {
            const data = await listarDeudas({
                codAnioAcademico: codAnioReporte,
                estado:
                    estadoDeudaFiltro === 'todos'
                        ? undefined
                        : estadoDeudaFiltro
            });

            if (activo) {
                setDeudasBackend(data);
            }
        } catch (err) {
            console.error('Error cargando deudas', err);

            if (activo) {
                setErrorDeudas(
                    'No se pudieron cargar las deudas desde el servidor.'
                );
            }
        } finally {
            if (activo) {
                setCargandoDeudas(false);
            }
        }
    };

    cargarDeudas();

    return () => {
        activo = false;
    };
}, [reporteActivo, codAnioReporte, estadoDeudaFiltro]);

const deudasFiltradas = deudasBackend.map((d) => ({
    codDeuda: d.codDeuda,
    alumno: `${d.matricula?.alumno?.apellidoPaterno || ''} ${d.matricula?.alumno?.apellidoMaterno || ''}, ${d.matricula?.alumno?.nombres || ''}`.trim(),
    doc: d.matricula?.alumno?.numeroDocumento || '',
    aula: `${d.matricula?.aula?.nivel?.nombre || ''} ${d.matricula?.aula?.grado?.nombre || ''} "${d.matricula?.aula?.seccion || ''}"`,
    montoTotal: Number(d.montoTotal || 0),
    montoPendiente: Number(d.montoPendiente || 0),
    estado: d.estado
}));

   
const [cajaBackend, setCajaBackend] = useState([]);
const [cargandoCaja, setCargandoCaja] = useState(false);
const [errorCaja, setErrorCaja] = useState('');

useEffect(() => {
    if (reporteActivo !== 'caja') return;

    let activo = true;

    const cargarCaja = async () => {
        setCargandoCaja(true);
        setErrorCaja('');

        try {
            const data = await reportePagos({
                desde: `${anioReporte}-01-01`,
                hasta: `${anioReporte}-12-31`
            });

            if (activo) {
                setCajaBackend(data);
            }
        } catch (err) {
            console.error('Error cargando pagos', err);

            if (activo) {
                setErrorCaja(
                    'No se pudieron cargar los pagos desde el servidor.'
                );
            }
        } finally {
            if (activo) {
                setCargandoCaja(false);
            }
        }
    };

    cargarCaja();

    return () => {
        activo = false;
    };
}, [reporteActivo, anioReporte]);

const cajaAgrupada = (() => {
    const grupos = {};

    cajaBackend.forEach((pago) => {
        if (!pago.fechaPago) return;

        const fecha = new Date(pago.fechaPago);
        const mes = MESES[fecha.getMonth()];

        const concepto =
            pago.concepto?.tipoConcepto?.nombre ||
            pago.concepto?.nombreConcepto ||
            'Otro';

        const clave = `${mes}-${concepto}`;

        if (!grupos[clave]) {
            grupos[clave] = {
                mes,
                concepto,
                cantPagos: 0,
                total: 0
            };
        }

        grupos[clave].cantPagos += 1;
        grupos[clave].total += Number(pago.montoCobrado || 0);
    });

    return Object.values(grupos).sort(
        (a, b) => MESES.indexOf(a.mes) - MESES.indexOf(b.mes)
    );
})();

    const cajaFiltrada =
    mesCajaFiltro === 'todos'
        ? cajaAgrupada
        : cajaAgrupada.filter((c) => c.mes === mesCajaFiltro);
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
        const filas = matriculaDelAnio.map(m => {
            const pct = Math.round((m.matriculados / m.cupoMax) * 100);
            return [m.aula, m.nivel, m.grado, m.matriculados, m.cupoMax, `${pct}%`];
        });
        descargarCSV(`reporte-matricula-${anioReporte}.csv`, ['Aula', 'Nivel', 'Grado', 'Matriculados', 'Cupo Máximo', '% Ocupación'], filas);
    };

    const exportarDeudasCSV = () => {
    const filas = deudasFiltradas.map((d) => [
        d.alumno,
        d.doc,
        d.aula,
        d.montoTotal,
        d.montoPendiente,
        d.estado
    ]);

    descargarCSV(
        `reporte-deudas-${anioReporte}.csv`,
        [
            'Alumno',
            'Documento',
            'Aula',
            'Monto Total',
            'Monto Pendiente',
            'Estado'
        ],
        filas
    );
};

    const exportarCajaCSV = () => {
        const filas = cajaFiltrada.map(c => [c.mes, c.concepto, c.cantPagos, c.total]);
        descargarCSV(`reporte-caja-${mesCajaFiltro === 'todos' ? anioReporte : mesCajaFiltro}.csv`, ['Mes', 'Concepto', 'Cantidad de Pagos', 'Total (S/)'], filas);
    };

    return (
        <>
            <h3 className="section-title" style={{ marginBottom: '1rem' }}>Reportes</h3>
            <div
    style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'flex-start',
        width: '100%',
        maxWidth: '1400px'
    }}
>
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

                <div
    style={{
        flex: 1,
        minWidth: 0,
        width: '100%'
    }}
>
                    {reporteActivo === 'vacantes' ? (
                        <>
                            <div className="perm-box" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                <div className="filter-group">
                                    <label>Año académico</label>
                                    <select className="filter-select" value={anioReporte} onChange={(e) => setAnioReporte(e.target.value)}>
                                        {aniosCatalogo.map(a => <option key={a.codAnioAcademico} value={a.anio}>{a.anio}</option>)}
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
                                        {aniosCatalogo.map(a => <option key={a.codAnioAcademico} value={a.anio}>{a.anio}</option>)}
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

                                {cargandoVacantes ? (
                                    <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Cargando matrículas...</p>
                                ) : errorVacantes ? (
                                    <p style={{ color: '#dc2626' }}>{errorVacantes}</p>
                                ) : (
                                    <>
                                        <table className="users-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th><th>Aula</th><th>Nivel</th><th>Grado</th>
                                                    <th>Matriculados</th><th>Cupo máx.</th><th>% Ocupación</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {matriculaDelAnio.map((m, idx) => {
                                                    const pct = Math.round((m.matriculados / m.cupoMax) * 100);
                                                    return (
                                                        <tr key={m.aula}>
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
                                                {matriculaDelAnio.length === 0 && (
                                                    <tr><td colSpan="7" className="table-footer-note">No hay aulas registradas para el año {anioReporte}.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                        <p className="table-footer-note">
                                            ⓘ Total matriculados {anioReporte}: <strong>{matriculaDelAnio.reduce((acc, m) => acc + m.matriculados, 0)}</strong> alumnos.
                                        </p>
                                    </>
                                )}
                            </div>
                        </>
                    ) : reporteActivo === 'deudas' ? (
                        <>
                            <div className="perm-box" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                <div className="filter-group">
                                    <label>Año académico</label>
                                    <select
    className="filter-select"
    value={anioReporte}
    onChange={(e) => setAnioReporte(e.target.value)}
>
    {aniosCatalogo.map((a) => (
        <option
            key={a.codAnioAcademico}
            value={a.anio}
        >
            {a.anio}
        </option>
    ))}
</select>
                                </div>
                                <div className="filter-group">
                                    <label>Estado</label>
                                    <select className="filter-select" value={estadoDeudaFiltro} onChange={(e) => setEstadoDeudaFiltro(e.target.value)}>
                                        <option value="todos">Todos</option>
<option value="PENDIENTE">Pendiente</option>
<option value="AL_DIA">Al día</option>
<option value="VENCIDA">Vencida</option>
                                    </select>
                                </div>
                                <button type="button" className="pagar-btn-solid" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={exportarDeudasCSV}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Exportar CSV
                                </button>
                            </div>

                            <div className="perm-box">
                                <p className="perm-subtitle">
    Reporte de Deudas — {anioReporte}
</p>

{cargandoDeudas ? (
    <p style={{ fontStyle: 'italic', color: '#6b7280' }}>
        Cargando deudas...
    </p>
) : errorDeudas ? (
    <p style={{ color: '#dc2626' }}>
        {errorDeudas}
    </p>
) : (
    <>
        <table className="pagos-table">
            <thead>
                <tr>
                    <th>Alumno</th>
                    <th>Documento</th>
                    <th>Aula</th>
                    <th>Monto total</th>
                    <th>Monto pendiente</th>
                    <th>Estado</th>
                </tr>
            </thead>

            <tbody>
                {deudasFiltradas.map((d) => {
                    const infoEstado = getEstadoDeuda(d.estado);

                    return (
                        <tr
                            key={d.codDeuda}
                            className={
                                d.estado === 'PENDIENTE'
                                    ? 'pagos-row-deuda'
                                    : ''
                            }
                        >
                            <td>{d.alumno}</td>
                            <td>{d.doc}</td>
                            <td>{d.aula}</td>
                            <td>{formatSoles(d.montoTotal)}</td>
                            <td>{formatSoles(d.montoPendiente)}</td>
                            <td>
                                <span className={infoEstado.className}>
                                    {infoEstado.label}
                                </span>
                            </td>
                        </tr>
                    );
                })}

                {deudasFiltradas.length === 0 && (
                    <tr>
                        <td
                            colSpan="6"
                            className="table-footer-note"
                        >
                            No hay registros de deuda para el año{' '}
                            {anioReporte}.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>

        <p className="table-footer-note">
            ⓘ Deuda pendiente total:{' '}
            <strong>
                {formatSoles(
                    deudasFiltradas.reduce(
                        (acc, d) => acc + d.montoPendiente,
                        0
                    )
                )}
            </strong>
            {' — '}
            {
                deudasFiltradas.filter(
                    (d) => d.estado === 'PENDIENTE'
                ).length
            }{' '}
            matrícula(s) con deuda.
        </p>
    </>
)}
                            </div>
                        </>
                    ) : (
                        <>
                            
                            <div className="perm-box" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                <div className="filter-group">
    <label>Año académico</label>
    <select
        className="filter-select"
        value={anioReporte}
        onChange={(e) => setAnioReporte(e.target.value)}
    >
        {aniosCatalogo.map((a) => (
            <option
                key={a.codAnioAcademico}
                value={a.anio}
            >
                {a.anio}
            </option>
        ))}
    </select>
</div>
                                <div className="filter-group">
                                    <label>Mes</label>
                                    <select className="filter-select" value={mesCajaFiltro} onChange={(e) => setMesCajaFiltro(e.target.value)}>
                                        <option value="todos">Todos</option>
                                        {MESES.map((mes) => (
    <option key={mes} value={mes}>
        {mes}
    </option>
))}
                                    </select>
                                </div>
                                <button type="button" className="pagar-btn-solid" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={exportarCajaCSV}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Exportar CSV
                                </button>
                            </div>

                            {cargandoCaja ? (
    <p style={{ fontStyle: 'italic', color: '#6b7280' }}>
        Cargando pagos...
    </p>
) : errorCaja ? (
    <p style={{ color: '#dc2626' }}>
        {errorCaja}
    </p>
) : (
    <>
        <div
            className="director-summary-grid"
            style={{ marginBottom: '1.75rem' }}
        >
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
                        <th>Mes</th>
                        <th>Concepto</th>
                        <th>Cant. pagos</th>
                        <th>Total</th>
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

                    {cajaFiltrada.length === 0 && (
                        <tr>
                            <td colSpan="4" className="table-footer-note">
                                No hay pagos registrados para el año {anioReporte}.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </>
)}

                            
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default Reportes;
