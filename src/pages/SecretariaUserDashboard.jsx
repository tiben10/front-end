import React, { useState } from 'react';
import '../Styles/Dashboard.css';

// --- Datos simulados (mock, solo en memoria) ---

const mockAulas = [
    { id: 1, nivel: 'Inicial', grado: '3 años', seccion: 'A', alumnos: 20, cupo: 25, estado: 'disponible' },
    { id: 2, nivel: 'Inicial', grado: '3 años', seccion: 'B', alumnos: 18, cupo: 25, estado: 'disponible' },
    { id: 3, nivel: 'Primaria', grado: '1°', seccion: 'A', alumnos: 30, cupo: 35, estado: 'casi_llena' },
    { id: 4, nivel: 'Secundaria', grado: '1°', seccion: 'A', alumnos: 35, cupo: 35, estado: 'llena' },
    { id: 5, nivel: 'Secundaria', grado: '2°', seccion: 'A', alumnos: 28, cupo: 35, estado: 'eliminada' }
];

const mockAlumnosPorAula = {
    1: [
        { n: 1, nombre: 'Fernández Ruiz, Camila', matricula: 'activa', aud: 'ini01' },
        { n: 2, nombre: 'Gómez Salas, Diego', matricula: 'activa', aud: 'ini01' },
        { n: 3, nombre: 'Herrera Luna, Valeria', matricula: 'pendiente', aud: 'ini01' },
        { n: 4, nombre: 'Ibarra Soto, Mateo', matricula: 'activa', aud: 'ini01' }
    ],
    2: [
        { n: 1, nombre: 'Juárez Vega, Renata', matricula: 'activa', aud: 'ini02' },
        { n: 2, nombre: 'Lozano Prado, Iker', matricula: 'activa', aud: 'ini02' },
        { n: 3, nombre: 'Medina Cruz, Sofía', matricula: 'trasladada', aud: 'ini02' },
        { n: 4, nombre: 'Nina Quispe, Adrián', matricula: 'activa', aud: 'ini02' }
    ],
    3: [
        { n: 1, nombre: 'Ochoa Ríos, Fabricio', matricula: 'activa', aud: 'pri01' },
        { n: 2, nombre: 'Paredes Mora, Ximena', matricula: 'activa', aud: 'pri01' },
        { n: 3, nombre: 'Quiroz Bravo, Thiago', matricula: 'pendiente', aud: 'pri01' },
        { n: 4, nombre: 'Rojas Ponce, Antonella', matricula: 'activa', aud: 'pri01' }
    ],
    4: [
        { n: 1, nombre: 'Chinga Ramos, Carlos', matricula: 'activa', aud: 'sec01' },
        { n: 2, nombre: 'López Díaz, Lucía', matricula: 'activa', aud: 'sec01' },
        { n: 3, nombre: 'Quispe Meza, Pedro', matricula: 'pendiente', aud: 'sec01' },
        { n: 4, nombre: 'Ramos Cruz, Ana', matricula: 'trasladada', aud: 'sec01' }
    ],
    5: [
        { n: 1, nombre: 'Salas Vidal, Rodrigo', matricula: 'trasladada', aud: 'sec02' },
        { n: 2, nombre: 'Torres Nina, Camila', matricula: 'trasladada', aud: 'sec02' },
        { n: 3, nombre: 'Ugarte Campos, Bruno', matricula: 'trasladada', aud: 'sec02' },
        { n: 4, nombre: 'Vera Chumpitaz, Diana', matricula: 'trasladada', aud: 'sec02' }
    ]
};

// --- Iconos (SVG en línea, estilo consistente con el resto del panel) ---

const IconMatricula = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
);
const IconPagos = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
);
const IconAlumnos = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const IconAulas = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M2 22V9l10-6 10 6v13"></path><path d="M9 22V13h6v9"></path></svg>
);
const IconConceptos = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 12h6"></path><path d="M9 16h6"></path><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M13 2v6h6"></path></svg>
);
const IconEye = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);
const IconClock = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
);

// --- Helpers de presentación ---

const estadoInfo = (estado) => {
    switch (estado) {
        case 'disponible': return { label: 'disponible', badgeClass: 'estado-disponible', barClass: 'fill-green' };
        case 'casi_llena': return { label: 'casi llena', badgeClass: 'estado-casi', barClass: 'fill-amber' };
        case 'llena': return { label: 'llena', badgeClass: 'estado-llena', barClass: 'fill-red' };
        case 'eliminada': return { label: 'eliminada lógico', badgeClass: 'estado-eliminada', barClass: 'fill-gray' };
        default: return { label: estado, badgeClass: 'estado-disponible', barClass: 'fill-green' };
    }
};

const matriculaBadgeClass = (estado) => {
    switch (estado) {
        case 'activa': return 'matric-activa';
        case 'pendiente': return 'matric-pendiente';
        case 'trasladada': return 'matric-trasladada';
        default: return 'matric-activa';
    }
};

const SecretariaUserDashboard = () => {
    const [activeTab, setActiveTab] = useState('aulas');
    const [anioAcademico, setAnioAcademico] = useState('2026');
    const [nivelFiltro, setNivelFiltro] = useState('Todos');
    // Aula seleccionada por defecto: Secundaria 1° A (id 4), igual que en la maqueta
    const [selectedAulaId, setSelectedAulaId] = useState(4);
    const [anioHistorico, setAnioHistorico] = useState('2026');

    const aulasFiltradas = mockAulas.filter(a => nivelFiltro === 'Todos' || a.nivel === nivelFiltro);
    const selectedAula = mockAulas.find(a => a.id === selectedAulaId) || null;
    const alumnosDeAula = selectedAula ? (mockAlumnosPorAula[selectedAula.id] || []) : [];

    return (
        <div className="dash-wrapper">
            <div className="dash-title-top">SECRETARÍA — GESTIÓN ACADÉMICA</div>

            <div className="dash-container">
                <header className="dash-header">
                    <div className="dash-header-left">
                        <IconAulas />
                        <h2>Aulas</h2>
                    </div>
                    <div className="dash-header-right">
                        <span className="badge-su" style={{ backgroundColor: '#ffedd5', color: '#c2410c' }}>SE</span>
                        <span className="user-name">María Torres</span>
                        <span className="role-badge role-se">secretaria</span>
                    </div>
                </header>

                <div className="dash-body">
                    <aside className="dash-sidebar">
                        <button
                            className={`sidebar-item ${activeTab === 'matricula' ? 'active' : ''}`}
                            onClick={() => setActiveTab('matricula')}
                        >
                            <IconMatricula /> Matrícula
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'pagos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('pagos')}
                        >
                            <IconPagos /> Pagos
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'alumnos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('alumnos')}
                        >
                            <IconAlumnos /> Alumnos
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'aulas' ? 'active' : ''}`}
                            onClick={() => setActiveTab('aulas')}
                        >
                            <IconAulas /> Aulas
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'conceptos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('conceptos')}
                        >
                            <IconConceptos /> Conceptos
                        </button>
                    </aside>

                    {activeTab === 'aulas' ? (
                        <>
                            <main className="dash-content">
                                <div className="filters-row">
                                    <div className="filter-group">
                                        <label>Año académico</label>
                                        <select
                                            className="filter-select"
                                            value={anioAcademico}
                                            onChange={(e) => setAnioAcademico(e.target.value)}
                                        >
                                            <option value="2026">2026</option>
                                            <option value="2025">2025</option>
                                            <option value="2024">2024</option>
                                        </select>
                                    </div>

                                    <div className="filter-group">
                                        <label>Nivel</label>
                                        <select
                                            className="filter-select"
                                            value={nivelFiltro}
                                            onChange={(e) => setNivelFiltro(e.target.value)}
                                        >
                                            <option value="Todos">Todos</option>
                                            <option value="Inicial">Inicial</option>
                                            <option value="Primaria">Primaria</option>
                                            <option value="Secundaria">Secundaria</option>
                                        </select>
                                    </div>

                                    <button className="btn-primary-outline" type="button">
                                        + Nueva aula
                                    </button>
                                </div>

                                <h3 className="section-title">Listado de aulas — {anioAcademico}</h3>

                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Nivel</th>
                                            <th>Grado</th>
                                            <th>Sec.</th>
                                            <th>Alumnos</th>
                                            <th>Cupo</th>
                                            <th>Estado</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aulasFiltradas.map((aula) => {
                                            const info = estadoInfo(aula.estado);
                                            const isSelected = selectedAulaId === aula.id;
                                            const isDeleted = aula.estado === 'eliminada';
                                            const porcentaje = Math.min(100, Math.round((aula.alumnos / aula.cupo) * 100));

                                            return (
                                                <tr
                                                    key={aula.id}
                                                    className={`clickable-row ${isDeleted ? 'deleted-row' : ''} ${isSelected ? 'selected-row-aula' : ''}`}
                                                    onClick={() => setSelectedAulaId(aula.id)}
                                                >
                                                    <td>{aula.nivel}</td>
                                                    <td>{aula.grado}</td>
                                                    <td>{aula.seccion}</td>
                                                    <td>{aula.alumnos}</td>
                                                    <td>
                                                        <div className="cupo-cell">
                                                            <span className="cupo-fraction">{aula.alumnos}/{aula.cupo}</span>
                                                            <div className="cupo-bar-track">
                                                                <div
                                                                    className={`cupo-bar-fill ${info.barClass}`}
                                                                    style={{ width: `${porcentaje}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`estado-badge ${info.badgeClass}`}>{info.label}</span>
                                                    </td>
                                                    <td className="action-cell">
                                                        <button
                                                            className="eye-btn"
                                                            title="Ver detalle"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedAulaId(aula.id);
                                                            }}
                                                        >
                                                            <IconEye />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </main>

                            <aside className="dash-permissions">
                                {!selectedAula ? (
                                    <div className="empty-aula-detail">
                                        👈 Selecciona un aula en la tabla para ver el detalle de alumnos.
                                    </div>
                                ) : (
                                    <>
                                        <div className="aula-detail-header">
                                            <h3 className="aula-detail-title">
                                                {selectedAula.nivel} {selectedAula.grado} {selectedAula.seccion} — alumnos {anioAcademico}
                                            </h3>
                                            <span className={`aula-cupo-badge ${estadoInfo(selectedAula.estado).badgeClass}`}>
                                                {selectedAula.alumnos}/{selectedAula.cupo}
                                            </span>
                                        </div>

                                        <table className="alumnos-mini-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Apellidos y nombre</th>
                                                    <th>Matríc.</th>
                                                    <th>Aud.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {alumnosDeAula.map((al) => (
                                                    <tr key={al.n}>
                                                        <td>{al.n}</td>
                                                        <td>{al.nombre}</td>
                                                        <td>
                                                            <span className={`matric-badge ${matriculaBadgeClass(al.matricula)}`}>
                                                                {al.matricula}
                                                            </span>
                                                        </td>
                                                        <td className="aud-text">{al.aud}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div className="footer-row">
                                            <span>Mostrando {alumnosDeAula.length} de {selectedAula.alumnos} alumnos</span>
                                            <button className="ver-todos-btn" type="button">Ver todos</button>
                                        </div>

                                        <div className="trazabilidad-box">
                                            <p className="trazabilidad-title">
                                                <IconClock /> Trazabilidad: registros anteriores conservados
                                            </p>
                                            <div className="trazabilidad-row">
                                                <select
                                                    className="filter-select"
                                                    value={anioHistorico}
                                                    onChange={(e) => setAnioHistorico(e.target.value)}
                                                    style={{ flex: 1 }}
                                                >
                                                    <option value="2026">2026</option>
                                                    <option value="2025">2025</option>
                                                    <option value="2024">2024</option>
                                                </select>
                                                <button className="historico-btn" type="button">
                                                    → Ver histórico
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </aside>
                        </>
                    ) : (
                        <main className="dash-content">
                            <h3 className="section-title">Próximamente</h3>
                            <p>Esta sección ({activeTab}) se implementará más adelante.</p>
                        </main>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecretariaUserDashboard;
