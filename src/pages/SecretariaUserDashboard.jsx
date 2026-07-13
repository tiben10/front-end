import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles/Dashboard.css';
import { useTabHistory } from '../hooks/useTabHistory';
import { cambiarPassword } from '../services/usuarioService';
import { logout, generar2FA } from '../services/authService';
import { decodeJwt } from '../services/jwt';
import Reportes from '../components/Reportes';
import { listarAulas, crearAula as crearAulaApi } from '../services/aulaService';
import { nivelService, gradoService } from '../services/catalogoService';
import { listarAlumnos, registrarAlumno } from '../services/alumnoService';
import { listarMatriculas, registrarMatricula } from '../services/matriculaService';
import { tipoDocumentoService, tipoConceptoService, anioAcademicoService } from '../services/catalogoService';
import {
    listarConceptos,
    crearConcepto as crearConceptoAPI,
    editarConcepto as editarConceptoAPI,
    clonarConceptos as clonarConceptosAPI
} from '../services/conceptoService';
import { listarCuotasPago, procesarPago } from '../services/pagoService';

const TOTP_STEP = 30; // segundos que dura cada codigo, igual que Google Authenticator

// Decodifica un secreto Base32 (el que devuelve /auth/generar-2fa) a bytes
const base32Decode = (base32) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of base32.replace(/=+$/, '')) {
        bits += alphabet.indexOf(char.toUpperCase()).toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return new Uint8Array(bytes);
};

// Genera el código TOTP REAL (RFC 6238) a partir del secreto real del usuario
const generarCodigoTOTP = async (secretBase32) => {
    if (!secretBase32) return '------';
    const key = base32Decode(secretBase32);
    const counter = Math.floor(Date.now() / 1000 / TOTP_STEP);
    const counterBytes = new ArrayBuffer(8);
    new DataView(counterBytes).setBigUint64(0, BigInt(counter));

    const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counterBytes));
    const offset = signature[19] & 0xf;
    const codeInt =
        ((signature[offset] & 0x7f) << 24) |
        ((signature[offset + 1] & 0xff) << 16) |
        ((signature[offset + 2] & 0xff) << 8) |
        (signature[offset + 3] & 0xff);
    return String(codeInt % 1000000).padStart(6, '0');
};

const mockAulas = [
    { id: 1, nivel: 'Inicial', grado: '3 años', seccion: 'A', alumnos: 20, cupo: 25, estado: 'disponible', anio: '2026' },
    { id: 2, nivel: 'Inicial', grado: '3 años', seccion: 'B', alumnos: 18, cupo: 25, estado: 'disponible', anio: '2026' },
    { id: 3, nivel: 'Primaria', grado: '1°', seccion: 'A', alumnos: 30, cupo: 35, estado: 'casi_llena', anio: '2026' },
    { id: 4, nivel: 'Secundaria', grado: '1°', seccion: 'A', alumnos: 35, cupo: 35, estado: 'llena', anio: '2026' },
    { id: 5, nivel: 'Secundaria', grado: '2°', seccion: 'A', alumnos: 28, cupo: 35, estado: 'eliminada', anio: '2026' }
];


const calcularEstadoAula = (alumnos, cupo) => {
    if (alumnos >= cupo) return 'llena';
    if (alumnos / cupo >= 0.9) return 'casi_llena';
    return 'disponible';
};

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
const mockAlumnosGeneral = [
    { id: 1, codigo: 'AL0001', documento: '75412638', tipoDoc: 'DNI', nombres: 'Carlos', apPaterno: 'Chinga', apMaterno: 'Ramos', nivel: 'Secundaria', grado: '1° A', estado: 'activa' },
    { id: 2, codigo: 'AL0002', documento: '76451239', tipoDoc: 'DNI', nombres: 'Lucía', apPaterno: 'López', apMaterno: 'Díaz', nivel: 'Secundaria', grado: '1° A', estado: 'activa' },
    { id: 3, codigo: 'AL0003', documento: '77561234', tipoDoc: 'DNI', nombres: 'Pedro', apPaterno: 'Quispe', apMaterno: 'Meza', nivel: 'Secundaria', grado: '1° A', estado: 'pendiente' },
    { id: 4, codigo: 'AL0004', documento: '78562341', tipoDoc: 'DNI', nombres: 'Ana', apPaterno: 'Ramos', apMaterno: 'Cruz', nivel: 'Secundaria', grado: '1° A', estado: 'trasladada' }
];



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
const IconSearch = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const IconWarning = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
);
const IconIdBadge = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="12" cy="10" r="2.5"></circle><path d="M7 17c0-2 2-3 5-3s5 1 5 3"></path></svg>
);
const IconPersonPlus = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
);
const IconShieldCheck = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
);



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



const mockAlumnosMaestro = [
    { apPaterno: 'Chinga', apMaterno: 'Ramos', nombre: 'Carlos' },
    { apPaterno: 'Chinga', apMaterno: 'López', nombre: 'Ana' },
    { apPaterno: 'Quispe', apMaterno: 'Meza', nombre: 'Pedro' },
    { apPaterno: 'López', apMaterno: 'Díaz', nombre: 'Lucía' },
    { apPaterno: 'Ramos', apMaterno: 'Cruz', nombre: 'Ana' },
    { apPaterno: 'Torres', apMaterno: 'Nina', nombre: 'María' }
];

const tituloSuperiorPorTab = {
    matricula: 'SECRETARÍA — PANEL PRINCIPAL (TODAS LAS OPERACIONES)',
    pagos: 'SECRETARÍA — PAGOS',
    alumnos: 'SECRETARÍA — ALUMNOS',
    aulas: 'SECRETARÍA — GESTIÓN ACADÉMICA',
    conceptos: 'SECRETARÍA — CONCEPTOS / TARIFARIO POR AÑO',
    reportes: 'SECRETARÍA — REPORTES',
    clave: 'SECRETARÍA — CAMBIAR CLAVE'
};

const SecretariaUserDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('matricula');
    useTabHistory(activeTab, setActiveTab);
    const [aulas, setAulas] = useState(mockAulas);
    const [alumnosPorAula, setAlumnosPorAula] = useState(mockAlumnosPorAula);
    const [anioAcademico, setAnioAcademico] = useState('2026');
    const [nivelFiltro, setNivelFiltro] = useState('Todos');
    // Aula seleccionada por defecto: Secundaria 1° A (id 4), igual que en la maqueta
    const [selectedAulaId, setSelectedAulaId] = useState(4);
    const [anioHistorico, setAnioHistorico] = useState('2026');
    const [showVerTodosModal, setShowVerTodosModal] = useState(false);


    const [anioAlumnos, setAnioAlumnos] = useState('2026');
    const [selectedAulaAlumnosId, setSelectedAulaAlumnosId] = useState(null);
    const [alumnosGeneral, setAlumnosGeneral] = useState(mockAlumnosGeneral);
    const [busquedaAlumno, setBusquedaAlumno] = useState('');
    const [showNuevoAlumnoModal, setShowNuevoAlumnoModal] = useState(false);
    const [alumnoError, setAlumnoError] = useState('');
    const [matriculasBackend, setMatriculasBackend] = useState([]);
    const [alumnosMatriculadosPorAnio, setAlumnosMatriculadosPorAnio] = useState({});
    const [cargandoDatosAcademicos, setCargandoDatosAcademicos] = useState(true);
    const [errorCargaAcademica, setErrorCargaAcademica] = useState('');

    const [tiposDocumento, setTiposDocumento] = useState([]);
    const [guardandoAlumno, setGuardandoAlumno] = useState(false);

    const [nuevoAlumno, setNuevoAlumno] = useState({
        codTipoDocumento: '',
        documento: '',
        nombres: '',
        apPaterno: '',
        apMaterno: '',
        fechaNacimiento: ''
    });


    const [claveActual, setClaveActual] = useState('');
    const [claveNueva, setClaveNueva] = useState('');
    const [claveConfirmar, setClaveConfirmar] = useState('');
    const [claveError, setClaveError] = useState('');
    const [claveExito, setClaveExito] = useState(false);
    const [currentUsername, setCurrentUsername] = useState('');

    // Toma el usuario real que inicio sesion desde el token JWT
    useEffect(() => {
        const token = localStorage.getItem('token');
        const claims = token ? decodeJwt(token) : null;
        if (claims?.sub) setCurrentUsername(claims.sub);
    }, []);
    const [showNewAulaForm, setShowNewAulaForm] = useState(false);
    const [newAula, setNewAula] = useState({ nivelNombre: 'Inicial', gradoNombre: '', codAnioAcademico: '', seccion: '', capacidadMaxima: '25' });
    const [newAulaError, setNewAulaError] = useState('');
    const [nivelesCatalogo, setNivelesCatalogo] = useState([]);
    const [gradosCatalogo, setGradosCatalogo] = useState([]);
    const [aniosCatalogo, setAniosCatalogo] = useState([]);


    const [anioMatricula, setAnioMatricula] = useState('2026');
    const [nombreAlumnoMatricula, setNombreAlumnoMatricula] = useState('');
    const [alumnoMatriculaSeleccionado, setAlumnoMatriculaSeleccionado] = useState(false);

    const [alumnoMatriculaSeleccionadoObj, setAlumnoMatriculaSeleccionadoObj] = useState(null);
    const [selectedAulaMatriculaId, setSelectedAulaMatriculaId] = useState(null);
    const [showAlumnoModal, setShowAlumnoModal] = useState(false);
    const [showAulaModal, setShowAulaModal] = useState(false);
    const [aulaQuery, setAulaQuery] = useState('');

    const [pagosPorMatricula, setPagosPorMatricula] = useState({
        'chinga-ramos-carlos-2026': [1, 2]
    });
    const [matriculaMensaje, setMatriculaMensaje] = useState('');

    // Verificacion en dos pasos (Google Authenticator) antes de confirmar la matricula
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [claveVerificacion2FA, setClaveVerificacion2FA] = useState('');
    const [errorPassword2FA, setErrorPassword2FA] = useState('');
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [metodo2FA, setMetodo2FA] = useState('qr'); // 'qr' | 'secreto'
    const [secretoCopiado, setSecretoCopiado] = useState(false);
    const [codigo2FAInput, setCodigo2FAInput] = useState('');
    const [error2FA, setError2FA] = useState('');
    const [codigoActual2FA, setCodigoActual2FA] = useState('------');
    const [segundosRestantes2FA, setSegundosRestantes2FA] = useState(() => TOTP_STEP - (Math.floor(Date.now() / 1000) % TOTP_STEP));
    const [secreto2FA, setSecreto2FA] = useState(null);   // { secret, qrUrl } real, viene del backend
    const [cargando2FA, setCargando2FA] = useState(false);


    const [anioConsultaPagos, setAnioConsultaPagos] = useState('2026');
    const [nombreAlumnoPagos, setNombreAlumnoPagos] = useState('');
    const [alumnoPagosSeleccionadoObj, setAlumnoPagosSeleccionadoObj] = useState(null); // { id, nombre, ... } real
    const [cuotasPagosBackend, setCuotasPagosBackend] = useState([]);  // todas las cuotas reales del alumno (todos los años)
    const [cargandoCuotasPagos, setCargandoCuotasPagos] = useState(false);
    const [errorCuotasPagos, setErrorCuotasPagos] = useState('');
    const [reciboMensaje, setReciboMensaje] = useState('');
    const [showHistorialPagosModal, setShowHistorialPagosModal] = useState(false);


    // ===== Conceptos (datos reales vía /api/conceptos) =====
    const [aniosAcademicosCatalogo, setAniosAcademicosCatalogo] = useState([]); // [{codAnioAcademico, anio}]
    const [tiposConceptoCatalogo, setTiposConceptoCatalogo] = useState([]);     // [{codTipoConcepto, nombre}]
    const [conceptosBackend, setConceptosBackend] = useState([]);              // conceptos crudos, todos los años
    const [selectedAnioConceptoId, setSelectedAnioConceptoId] = useState(null); // codAnioAcademico elegido
    const [cargandoConceptos, setCargandoConceptos] = useState(false);
    const [errorConceptos, setErrorConceptos] = useState('');
    const [guardandoConcepto, setGuardandoConcepto] = useState(false);

    const [editingConceptoId, setEditingConceptoId] = useState(null);
    const [editDraft, setEditDraft] = useState({ nombre: '', codTipoConcepto: '', monto: '', orden: '' });
    const [showNewConceptoForm, setShowNewConceptoForm] = useState(false);
    const [newConcepto, setNewConcepto] = useState({ nombre: '', codTipoConcepto: '', monto: '', obligatorio: true });
    const [anioDestinoClonar, setAnioDestinoClonar] = useState('');

    // Carga los catálogos (años académicos, tipos de concepto) una sola vez, al montar el panel
    useEffect(() => {
        if (aniosAcademicosCatalogo.length > 0) return;
        Promise.all([anioAcademicoService.listar(), tipoConceptoService.listar()])
            .then(([anios, tipos]) => {
                const aniosActivos = anios.filter(a => a.estado);
                setAniosAcademicosCatalogo(aniosActivos);
                setTiposConceptoCatalogo(tipos.filter(t => t.estado));
                if (aniosActivos.length > 0) setSelectedAnioConceptoId(aniosActivos[0].codAnioAcademico);
            })
            .catch(err => {
                console.error('Error cargando catálogos de conceptos', err);
                setErrorConceptos('No se pudieron cargar los años académicos / tipos de concepto.');
            });
    }, [aniosAcademicosCatalogo.length]);

    // Trae los conceptos reales del backend
    const cargarConceptos = useCallback(async () => {
        setCargandoConceptos(true);
        setErrorConceptos('');
        try {
            const data = await listarConceptos();
            setConceptosBackend(data.filter(c => c.estado));
        } catch (err) {
            console.error('Error cargando conceptos', err);
            setErrorConceptos('No se pudieron cargar los conceptos. Verifica tu permiso "ver" en Conceptos.');
        } finally {
            setCargandoConceptos(false);
        }
    }, []);

    useEffect(() => {
        cargarConceptos();
    }, [cargarConceptos]);

    const conceptosDelAnio = conceptosBackend
        .filter(c => c.anioAcademico?.codAnioAcademico === selectedAnioConceptoId)
        .map(c => ({
            id: c.codConcepto,
            nombre: c.nombreConcepto,
            tipo: c.tipoConcepto?.nombre,
            codTipoConcepto: c.tipoConcepto?.codTipoConcepto,
            monto: Number(c.monto),
            orden: c.ordenPago,
            obligatorio: c.obligatorio,
            version: c.version
        }))
        .sort((a, b) => a.orden - b.orden);

    const anioConceptosLabel = aniosAcademicosCatalogo.find(a => a.codAnioAcademico === selectedAnioConceptoId)?.anio || '';


    const toggleObligatorio = async (concepto) => {
        setGuardandoConcepto(true);
        try {
            await editarConceptoAPI(concepto.id, {
                codAnioAcademico: selectedAnioConceptoId,
                codTipoConcepto: concepto.codTipoConcepto,
                nombreConcepto: concepto.nombre,
                monto: concepto.monto,
                ordenPago: concepto.orden,
                obligatorio: !concepto.obligatorio,
                version: concepto.version
            });
            await cargarConceptos();
        } catch (err) {
            console.error('Error actualizando concepto', err);
            setErrorConceptos('No se pudo actualizar el concepto (¿otro usuario lo modificó?).');
        } finally {
            setGuardandoConcepto(false);
        }
    };

    const startEditConcepto = (concepto) => {
        setEditingConceptoId(concepto.id);
        setEditDraft({
            nombre: concepto.nombre,
            codTipoConcepto: String(concepto.codTipoConcepto),
            monto: String(concepto.monto),
            orden: String(concepto.orden)
        });
    };

    const cancelEditConcepto = () => {
        setEditingConceptoId(null);
        setEditDraft({ nombre: '', codTipoConcepto: '', monto: '', orden: '' });
    };

    const saveConcepto = async (concepto) => {
        if (!editDraft.nombre.trim() || !editDraft.monto || !editDraft.orden || !editDraft.codTipoConcepto) return;

        setGuardandoConcepto(true);
        try {
            await editarConceptoAPI(concepto.id, {
                codAnioAcademico: selectedAnioConceptoId,
                codTipoConcepto: Number(editDraft.codTipoConcepto),
                nombreConcepto: editDraft.nombre.trim(),
                monto: Number(editDraft.monto),
                ordenPago: Number(editDraft.orden),
                obligatorio: concepto.obligatorio,
                version: concepto.version
            });
            cancelEditConcepto();
            await cargarConceptos();
        } catch (err) {
            const msg = err.response?.data;
            setErrorConceptos(typeof msg === 'string' ? msg : 'No se pudo guardar el concepto.');
        } finally {
            setGuardandoConcepto(false);
        }
    };

    const crearConcepto = async (e) => {
        e.preventDefault();
        if (!newConcepto.nombre.trim() || !newConcepto.monto || !newConcepto.codTipoConcepto || !selectedAnioConceptoId) return;

        const siguienteOrden = conceptosDelAnio.length > 0 ? Math.max(...conceptosDelAnio.map(c => c.orden)) + 1 : 1;

        setGuardandoConcepto(true);
        try {
            await crearConceptoAPI({
                codAnioAcademico: selectedAnioConceptoId,
                codTipoConcepto: Number(newConcepto.codTipoConcepto),
                nombreConcepto: newConcepto.nombre.trim(),
                monto: Number(newConcepto.monto),
                ordenPago: siguienteOrden,
                obligatorio: newConcepto.obligatorio
            });
            setNewConcepto({ nombre: '', codTipoConcepto: '', monto: '', obligatorio: true });
            setShowNewConceptoForm(false);
            await cargarConceptos();
        } catch (err) {
            const msg = err.response?.data;
            setErrorConceptos(typeof msg === 'string' ? msg : 'No se pudo crear el concepto.');
        } finally {
            setGuardandoConcepto(false);
        }
    };

    const clonarAAnioSiguiente = async () => {
        if (!anioDestinoClonar || !selectedAnioConceptoId) return;
        setGuardandoConcepto(true);
        setErrorConceptos('');
        try {
            await clonarConceptosAPI(selectedAnioConceptoId, Number(anioDestinoClonar));
            setSelectedAnioConceptoId(Number(anioDestinoClonar));
            setAnioDestinoClonar('');
            await cargarConceptos();
        } catch (err) {
            const msg = err.response?.data;
            setErrorConceptos(typeof msg === 'string' ? msg : 'No se pudo clonar los conceptos.');
        } finally {
            setGuardandoConcepto(false);
        }
    };

    useEffect(() => {
        if (!show2FAModal || !secreto2FA) return;
        const actualizarCodigo = async () => {
            setSegundosRestantes2FA(TOTP_STEP - (Math.floor(Date.now() / 1000) % TOTP_STEP));
            setCodigoActual2FA(await generarCodigoTOTP(secreto2FA.secret));
        };
        actualizarCodigo();
        const interval = setInterval(actualizarCodigo, 1000);
        return () => clearInterval(interval);
    }, [show2FAModal, secreto2FA]);
    // Carga aulas, alumnos y matrículas reales desde el backend y las adapta al formato que usa el panel
    useEffect(() => {
        let activo = true;

        const cargarDatosAcademicos = async () => {
            setCargandoDatosAcademicos(true);
            setErrorCargaAcademica('');
            try {
                const [aulasBackend, alumnosBackend, matriculasReales] = await Promise.all([
                    listarAulas(),
                    listarAlumnos(),
                    listarMatriculas()
                ]);
                if (!activo) return;

                // Cuántos alumnos con matrícula activa tiene cada aula (para cupo/estado)
                const activasPorAula = {};
                matriculasReales.forEach((m) => {
                    if (m.estado === 'activa' && m.aula?.codAula) {
                        activasPorAula[m.aula.codAula] = (activasPorAula[m.aula.codAula] || 0) + 1;
                    }
                });

                const aulasMapeadas = aulasBackend
                    .filter((a) => a.estado)
                    .map((a) => {
                        const ocupadas = activasPorAula[a.codAula] || 0;
                        return {
                            id: a.codAula,
                            nivel: a.nivel?.nombre || '',
                            grado: a.grado?.nombre || '',
                            seccion: a.seccion,
                            alumnos: ocupadas,
                            cupo: a.capacidadMaxima,
                            estado: calcularEstadoAula(ocupadas, a.capacidadMaxima),
                            anio: a.anioAcademico?.anio || ''
                        };
                    });

                // Alumnos matriculados por aula, para la pestaña "Aulas" (listado)
                const porAula = {};
                matriculasReales
                    .slice()
                    .sort((a, b) => a.codMatricula - b.codMatricula)
                    .forEach((m) => {
                        const codAula = m.aula?.codAula;
                        if (!codAula) return;
                        const lista = porAula[codAula] || [];
                        const nombreCompleto = `${m.alumno?.apellidoPaterno || ''} ${m.alumno?.apellidoMaterno || ''}, ${m.alumno?.nombres || ''}`.trim();
                        lista.push({
                            n: lista.length + 1,
                            nombre: nombreCompleto,
                            matricula: m.estado,
                            aud: `M-${m.codMatricula}`,
                            codAlumno: m.alumno?.codAlumno
                        });
                        porAula[codAula] = lista;
                    });

                // Set de alumnos ya matriculados por año, para no ofrecerlos de nuevo al matricular
                const matriculadosPorAnio = {};
                matriculasReales.forEach((m) => {
                    if (m.estado !== 'activa') return;
                    const anio = m.anioAcademico?.anio;
                    const codAlumno = m.alumno?.codAlumno;
                    if (!anio || !codAlumno) return;
                    if (!matriculadosPorAnio[anio]) matriculadosPorAnio[anio] = [];
                    matriculadosPorAnio[anio].push(codAlumno);
                });

                // Nivel/grado vigente de cada alumno, según su matrícula activa más reciente (para la pestaña Alumnos)
                const nivelGradoPorAlumno = {};
                matriculasReales.forEach((m) => {
                    if (m.estado !== 'activa') return;
                    const codAlumno = m.alumno?.codAlumno;
                    if (!codAlumno) return;
                    nivelGradoPorAlumno[codAlumno] = {
                        nivel: m.aula?.nivel?.nombre || '',
                        grado: m.aula?.grado?.nombre ? `${m.aula.grado.nombre} ${m.aula.seccion}` : ''
                    };
                });

                const alumnosMapeados = alumnosBackend.map((al) => ({
                    id: al.codAlumno,
                    codigo: `AL${String(al.codAlumno).padStart(4, '0')}`,
                    documento: al.numeroDocumento,
                    tipoDoc: al.tipoDocumento?.nombre || '',
                    nombres: al.nombres,
                    apPaterno: al.apellidoPaterno,
                    apMaterno: al.apellidoMaterno,
                    nivel: nivelGradoPorAlumno[al.codAlumno]?.nivel || 'Sin matrícula',
                    grado: nivelGradoPorAlumno[al.codAlumno]?.grado || '',
                    estado: al.estado ? 'activa' : 'inactiva'
                }));

                if (!activo) return;
                setAulas(aulasMapeadas);
                setAlumnosPorAula(porAula);
                setAlumnosGeneral(alumnosMapeados);
                setMatriculasBackend(matriculasReales);
                setAlumnosMatriculadosPorAnio(matriculadosPorAnio);
                if (aulasMapeadas.length > 0) setSelectedAulaId((prev) => prev ?? aulasMapeadas[0].id);
            } catch (err) {
                console.error('Error al cargar datos académicos', err);
                if (activo) setErrorCargaAcademica('No se pudieron cargar aulas/alumnos desde el servidor.');
            } finally {
                if (activo) setCargandoDatosAcademicos(false);
            }
        };

        cargarDatosAcademicos();
        return () => { activo = false; };
    }, []);

    // Carga los tipos de documento reales (DNI, CE, etc.) para el formulario de Nuevo Alumno
    useEffect(() => {
        let activo = true;
        tipoDocumentoService.listar()
            .then((data) => {
                if (!activo) return;
                setTiposDocumento(data.filter((t) => t.estado));
            })
            .catch((err) => console.error('Error al cargar tipos de documento', err));
        return () => { activo = false; };
    }, []);

    // Carga los catálogos reales (niveles, grados, años academicos) para el formulario de "Nueva aula"
    useEffect(() => {
        let activo = true;
        Promise.all([nivelService.listar(), gradoService.listar(), anioAcademicoService.listar()])
            .then(([niveles, grados, anios]) => {
                if (!activo) return;
                setNivelesCatalogo(niveles.filter(n => n.estado));
                setGradosCatalogo(grados.filter(g => g.estado));
                setAniosCatalogo(anios.filter(a => a.estado));
            })
            .catch((err) => console.error('Error al cargar catálogos de aula', err));
        return () => { activo = false; };
    }, []);

    // Carga TODAS las cuotas reales del alumno seleccionado en Pagos (todos los años, para armar el historial)
    useEffect(() => {
        if (!alumnoPagosSeleccionadoObj?.id) {
            setCuotasPagosBackend([]);
            return;
        }
        let activo = true;
        setCargandoCuotasPagos(true);
        setErrorCuotasPagos('');
        listarCuotasPago(alumnoPagosSeleccionadoObj.id, null)
            .then((data) => { if (activo) setCuotasPagosBackend(data); })
            .catch((err) => {
                console.error('Error al cargar cuotas del alumno', err);
                if (activo) setErrorCuotasPagos('No se pudieron cargar las cuotas. Verifica tu permiso "ver" en Pagos.');
            })
            .finally(() => { if (activo) setCargandoCuotasPagos(false); });
        return () => { activo = false; };
    }, [alumnoPagosSeleccionadoObj]);

    const aulasFiltradas = aulas.filter(a => (nivelFiltro === 'Todos' || a.nivel === nivelFiltro) && a.anio === anioAcademico);
    const selectedAula = aulas.find(a => a.id === selectedAulaId) || null;
    const alumnosDeAula = selectedAula ? (alumnosPorAula[selectedAula.id] || []) : [];

    // Aulas y alumnos para la pestaña "Alumnos" (independiente de la pestaña Aulas)
    const aulasParaAlumnos = aulas.filter(a => a.anio === anioAlumnos && a.estado !== 'eliminada');
    const selectedAulaAlumnos = aulas.find(a => a.id === selectedAulaAlumnosId) || null;
    const alumnosDeAulaSeleccionada = selectedAulaAlumnos ? (alumnosPorAula[selectedAulaAlumnos.id] || []) : [];
    const alumnosFiltradosGeneral = alumnosGeneral.filter((alumno) => {
        const texto =
            `${alumno.codigo} ${alumno.nombres} ${alumno.apPaterno} ${alumno.apMaterno} ${alumno.documento}`.toLowerCase();

        return texto.includes(busquedaAlumno.toLowerCase());
    });

    const guardarNuevoAlumno = async (e) => {
        e.preventDefault();
        setAlumnoError('');

        if (
            !nuevoAlumno.codTipoDocumento ||
            !nuevoAlumno.documento.trim() ||
            !nuevoAlumno.nombres.trim() ||
            !nuevoAlumno.apPaterno.trim() ||
            !nuevoAlumno.apMaterno.trim() ||
            !nuevoAlumno.fechaNacimiento
        ) {
            setAlumnoError('Todos los campos son obligatorios.');
            return;
        }

        setGuardandoAlumno(true);
        try {
            const alumnoGuardado = await registrarAlumno({
                codTipoDocumento: Number(nuevoAlumno.codTipoDocumento),
                numeroDocumento: nuevoAlumno.documento.trim(),
                nombres: nuevoAlumno.nombres.trim(),
                apellidoPaterno: nuevoAlumno.apPaterno.trim(),
                apellidoMaterno: nuevoAlumno.apMaterno.trim(),
                fechaNacimiento: nuevoAlumno.fechaNacimiento
            });

            const tipoDocNombre = tiposDocumento.find(
                (t) => t.codTipoDocumento === Number(nuevoAlumno.codTipoDocumento)
            )?.nombre || '';

            const alumnoCreado = {
                id: alumnoGuardado.codAlumno,
                codigo: `AL${String(alumnoGuardado.codAlumno).padStart(4, '0')}`,
                documento: alumnoGuardado.numeroDocumento,
                tipoDoc: tipoDocNombre,
                nombres: alumnoGuardado.nombres,
                apPaterno: alumnoGuardado.apellidoPaterno,
                apMaterno: alumnoGuardado.apellidoMaterno,
                nivel: 'Sin matrícula',
                grado: '',
                estado: 'activa'
            };

            setAlumnosGeneral((prev) => [...prev, alumnoCreado]);

            setNuevoAlumno({
                codTipoDocumento: '',
                documento: '',
                nombres: '',
                apPaterno: '',
                apMaterno: '',
                fechaNacimiento: ''
            });
            setShowNuevoAlumnoModal(false);
        } catch (err) {
            const msg = err.response?.data;
            setAlumnoError(typeof msg === 'string' ? msg : 'No se pudo registrar el alumno.');
        } finally {
            setGuardandoAlumno(false);
        }
    };

    const crearAula = async (e) => {
        e.preventDefault();
        setNewAulaError('');

        const nivelTexto = newAula.nivelNombre.trim();
        const gradoTexto = newAula.gradoNombre.trim();
        const seccionLimpia = newAula.seccion.trim().toUpperCase();
        const capacidadNumero = Number(newAula.capacidadMaxima);

        if (!newAula.codAnioAcademico) {
            setNewAulaError('Debes seleccionar el año académico.');
            return;
        }
        if (!nivelTexto) {
            setNewAulaError('Debes seleccionar el nivel.');
            return;
        }
        if (!gradoTexto) {
            setNewAulaError('El grado es obligatorio (ej. "1°" o "3 años").');
            return;
        }
        if (!/^[A-Za-z]{1,2}$/.test(seccionLimpia)) {
            setNewAulaError('La sección debe tener 1 o 2 letras (ej. "A", "B1").');
            return;
        }
        if (!newAula.capacidadMaxima || isNaN(capacidadNumero) || capacidadNumero <= 0) {
            setNewAulaError('El cupo debe ser un número mayor a 0.');
            return;
        }

        try {
            // Busca el nivel por nombre en el catálogo ya cargado; si no existe todavía, lo crea
            let nivel = nivelesCatalogo.find(n => n.nombre.toLowerCase() === nivelTexto.toLowerCase());
            if (!nivel) {
                nivel = await nivelService.crear({ nombre: nivelTexto });
                setNivelesCatalogo(prev => [...prev, nivel]);
            }

            // Busca el grado por nombre; si no existe todavía, lo crea (ej. "1°", "3 años")
            let grado = gradosCatalogo.find(g => g.nombre.toLowerCase() === gradoTexto.toLowerCase());
            if (!grado) {
                grado = await gradoService.crear({ nombre: gradoTexto });
                setGradosCatalogo(prev => [...prev, grado]);
            }

            const aulaCreada = await crearAulaApi({
                codAnioAcademico: Number(newAula.codAnioAcademico),
                codNivel: nivel.codNivel,
                codGrado: grado.codGrado,
                seccion: seccionLimpia,
                capacidadMaxima: capacidadNumero
            });

            // Recarga aulas reales desde el backend (misma logica de mapeo que el useEffect inicial)
            const aulasBackend = await listarAulas();
            const matriculasReales = await listarMatriculas();
            const activasPorAula = {};
            matriculasReales.forEach((m) => {
                if (m.estado === 'activa' && m.aula?.codAula) {
                    activasPorAula[m.aula.codAula] = (activasPorAula[m.aula.codAula] || 0) + 1;
                }
            });
            const aulasMapeadas = aulasBackend
                .filter((a) => a.estado)
                .map((a) => {
                    const ocupadas = activasPorAula[a.codAula] || 0;
                    return {
                        id: a.codAula,
                        nivel: a.nivel?.nombre || '',
                        grado: a.grado?.nombre || '',
                        seccion: a.seccion,
                        alumnos: ocupadas,
                        cupo: a.capacidadMaxima,
                        estado: calcularEstadoAula(ocupadas, a.capacidadMaxima),
                        anio: a.anioAcademico?.anio || ''
                    };
                });
            setAulas(aulasMapeadas);

            setSelectedAulaId(aulaCreada.codAula);
            setNewAula({ nivelNombre: 'Inicial', gradoNombre: '', codAnioAcademico: newAula.codAnioAcademico, seccion: '', capacidadMaxima: '25' });
            setShowNewAulaForm(false);
        } catch (err) {
            const msg = err.response?.data;
            setNewAulaError(typeof msg === 'string' ? msg : 'No se pudo crear el aula.');
        }
    };


    const cambiarClave = async (e) => {
        e.preventDefault();
        setClaveError('');
        setClaveExito(false);

        if (!claveActual || !claveNueva || !claveConfirmar) {
            setClaveError('Todos los campos son obligatorios.');
            return;
        }
        if (claveNueva.length < 8) {
            setClaveError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (claveNueva !== claveConfirmar) {
            setClaveError('La nueva contraseña y su confirmación no coinciden.');
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
            setClaveConfirmar('');
            setTimeout(() => setClaveExito(false), 3000);
        } catch (err) {
            setClaveError(
                err.response?.status === 401 || err.response?.status === 403
                    ? 'La contraseña actual no es correcta.'
                    : 'No se pudo conectar con el servidor.'
            );
        }
    };

    const selectedAulaMatricula = aulas.find(a => a.id === selectedAulaMatriculaId) || null;
    const aulaMatriculaLlena = selectedAulaMatricula?.estado === 'llena';

    const matriculaKey = `${nombreAlumnoMatricula.trim().toLowerCase().replace(/\s+/g, '-')}-${anioMatricula}`;
    const pagadosIds = pagosPorMatricula[matriculaKey] || [];

    const codAnioMatricula = aniosAcademicosCatalogo.find(a => a.anio === anioMatricula)?.codAnioAcademico;
    const conceptosDelAnioMatricula = conceptosBackend
        .filter(c => c.anioAcademico?.codAnioAcademico === codAnioMatricula)
        .map(c => ({ id: c.codConcepto, nombre: c.nombreConcepto, monto: Number(c.monto), orden: c.ordenPago, obligatorio: c.obligatorio }))
        .sort((a, b) => a.orden - b.orden);


    let bloqueoEncontrado = false;
    const cuotasConEstado = conceptosDelAnioMatricula.map((concepto) => {
        const pagado = pagadosIds.includes(concepto.id);
        let estado;
        if (pagado) {
            estado = 'pagado';
        } else if (bloqueoEncontrado) {
            estado = 'bloqueado';
        } else {
            estado = 'pagar';
            bloqueoEncontrado = true;
        }
        return { ...concepto, estadoPago: estado };
    });

    const primerBloqueado = cuotasConEstado.find(c => c.estadoPago === 'bloqueado');
    const cuotaAnteriorAlBloqueo = primerBloqueado
        ? cuotasConEstado.filter(c => c.orden < primerBloqueado.orden).slice(-1)[0]
        : null;


    const pagarCuota = (conceptoId) => {
        setPagosPorMatricula(prev => ({
            ...prev,
            [matriculaKey]: [...(prev[matriculaKey] || []), conceptoId]
        }));
    };


    const aulasFiltradasModal = aulas.filter(a => {
        const q = aulaQuery.trim().toLowerCase();
        if (!q) return true;
        return a.nivel.toLowerCase().includes(q) || a.grado.toLowerCase().includes(q) || a.seccion.toLowerCase().includes(q);
    });


    const aulasDisponiblesModal = aulas.filter(a =>
        a.anio === anioMatricula && a.estado !== 'llena' && a.estado !== 'eliminada'
    );
    // Alumnos registrados (activos) que aún NO tienen matrícula activa en el año seleccionado
    const alumnosDisponiblesModal = alumnosGeneral
        .filter(al => al.estado === 'activa')
        .filter(al => !(alumnosMatriculadosPorAnio[anioMatricula] || []).includes(al.id))
        .map(al => ({
            ...al,
            nombre: `${al.apPaterno} ${al.apMaterno}, ${al.nombres}`,
            aulaLabel: al.documento
        }))
        .filter(al => {
            const q = nombreAlumnoMatricula.trim().toLowerCase();
            if (!q) return true;
            return al.nombre.toLowerCase().includes(q);
        });

    const seleccionarAlumnoModal = (alumno) => {
        if (activeTab === 'matricula') {
            setNombreAlumnoMatricula(alumno.nombre);
            setAlumnoMatriculaSeleccionado(true);
            setAlumnoMatriculaSeleccionadoObj(alumno.id ? alumno : null);
            setMatriculaMensaje('');
        }

        if (activeTab === 'pagos') {
            setNombreAlumnoPagos(alumno.nombre);
            setAlumnoPagosSeleccionadoObj(alumno.id ? alumno : null);
            setReciboMensaje('');
            setErrorCuotasPagos('');
        }

        setShowAlumnoModal(false);
    };

    const seleccionarAulaModal = (aula) => {
        if (aula.estado === 'llena') return;
        setSelectedAulaMatriculaId(aula.id);
        setShowAulaModal(false);
        setMatriculaMensaje('');
    };


    // Abre el modal de confirmacion de contrasena (primer paso, antes de mostrar el Authenticator)
    const abrirVerificacion2FA = () => {
        if (!nombreAlumnoMatricula.trim() || !selectedAulaMatricula) return;
        if (aulaMatriculaLlena) return;
        setErrorPassword2FA('');
        setClaveVerificacion2FA('');
        setShowPasswordModal(true);
    };

    // Valida la contrasena (SIMULACION: no hay backend, se acepta cualquier valor de al menos 4 caracteres)
    // y, si es correcta, pasa al segundo paso: mostrar el Google Authenticator (QR o secreto) + input del codigo.
    const confirmarPassword2FA = async (e) => {
        e.preventDefault();
        if (!claveVerificacion2FA.trim()) {
            setErrorPassword2FA('Ingresa tu contraseña para continuar.');
            return;
        }
        if (claveVerificacion2FA.trim().length < 4) {
            setErrorPassword2FA('Contraseña incorrecta.');
            return;
        }

        // Si aun no tenemos un secreto 2FA real, lo tomamos de localStorage o lo pedimos al backend UNA SOLA VEZ
        if (!secreto2FA) {
            const guardado = localStorage.getItem(`secreto2FA_${currentUsername}`);
            if (guardado) {
                setSecreto2FA(JSON.parse(guardado));
            } else {
                setCargando2FA(true);
                try {
                    const datos = await generar2FA(); // { secret, qrUrl }
                    localStorage.setItem(`secreto2FA_${currentUsername}`, JSON.stringify(datos));
                    setSecreto2FA(datos);
                } catch (err) {
                    setErrorPassword2FA('No se pudo generar el código de verificación. Intenta de nuevo.');
                    setCargando2FA(false);
                    return;
                }
                setCargando2FA(false);
            }
        }

        setShowPasswordModal(false);
        setClaveVerificacion2FA('');
        setError2FA('');
        setCodigo2FAInput('');
        setMetodo2FA('qr');
        setShow2FAModal(true);
    };

    // Copia el secreto manual de Google Authenticator al portapapeles
    const copiarSecreto2FA = async () => {
        try {
            await navigator.clipboard.writeText(secreto2FA?.secret || '');
            setSecretoCopiado(true);
            setTimeout(() => setSecretoCopiado(false), 2000);
        } catch {
            setSecretoCopiado(false);
        }
    };

    // Envia el codigo TOTP real al backend, que valida y crea la matricula de verdad
    const confirmarCodigo2FA = async (e) => {
        e.preventDefault();
        setError2FA('');

        if (!alumnoMatriculaSeleccionadoObj?.id || !selectedAulaMatricula?.id) {
            setError2FA('Selecciona un alumno y un aula válidos antes de continuar.');
            return;
        }

        try {
            const nuevaMatricula = await registrarMatricula(
                alumnoMatriculaSeleccionadoObj.id,
                selectedAulaMatricula.id,
                codigo2FAInput.trim()
            );

            setShow2FAModal(false);
            setCodigo2FAInput('');
            setMatriculaMensaje(`✓ ${nombreAlumnoMatricula.trim()} matriculado correctamente (matrícula #${nuevaMatricula.codMatricula}).`);
            setTimeout(() => setMatriculaMensaje(''), 4000);

            // Refresca aulas y matrículas reales desde el backend
            const [aulasBackend, matriculasReales] = await Promise.all([listarAulas(), listarMatriculas()]);
            const activasPorAula = {};
            matriculasReales.forEach((m) => {
                if (m.estado === 'activa' && m.aula?.codAula) {
                    activasPorAula[m.aula.codAula] = (activasPorAula[m.aula.codAula] || 0) + 1;
                }
            });
            const aulasMapeadas = aulasBackend
                .filter((a) => a.estado)
                .map((a) => {
                    const ocupadas = activasPorAula[a.codAula] || 0;
                    return {
                        id: a.codAula,
                        nivel: a.nivel?.nombre || '',
                        grado: a.grado?.nombre || '',
                        seccion: a.seccion,
                        alumnos: ocupadas,
                        cupo: a.capacidadMaxima,
                        estado: calcularEstadoAula(ocupadas, a.capacidadMaxima),
                        anio: a.anioAcademico?.anio || ''
                    };
                });
            setAulas(aulasMapeadas);
            setMatriculasBackend(matriculasReales);

        } catch (err) {
            const msg = typeof err.response?.data === 'string'
                ? err.response.data
                : 'No se pudo registrar la matrícula.';
            setError2FA(msg);
        }
    };

    const todosLosAlumnosPagos = aulas
        .filter(a => a.anio === anioConsultaPagos)
        .flatMap(a => (alumnosPorAula[a.id] || []).map(al => ({
            ...al,
            id: al.codAlumno,
            aulaLabel: `${a.nivel} ${a.grado} "${a.seccion}"`
        })));

    // Cuotas reales del año que se está consultando, con su estado real (PENDIENTE/PAGADO) del backend
    const cuotasAnioActual = cuotasPagosBackend
        .filter(c => c.matricula?.anioAcademico?.anio === anioConsultaPagos)
        .map(c => ({
            id: c.codCuota,
            concepto: c.concepto?.nombreConcepto || '',
            monto: Number(c.montoCobrado),
            orden: c.concepto?.ordenPago || 0,
            estadoBackend: c.estado,       // 'PENDIENTE' | 'PAGADO'
            recibo: c.recibo,
            fechaPago: c.fechaPago
        }))
        .sort((a, b) => a.orden - b.orden);

    let bloqueoPagosEncontrado = false;
    const cuotasPagosConEstado = cuotasAnioActual.map((cuota) => {
        let estado;
        if (cuota.estadoBackend === 'PAGADO') {
            estado = 'pagado';
        } else if (bloqueoPagosEncontrado) {
            estado = 'bloqueado';
        } else {
            estado = 'deuda';
            bloqueoPagosEncontrado = true;
        }
        return { ...cuota, estadoPago: estado };
    });

    // Historial de años anteriores (real), agrupado a partir de las cuotas del alumno
    const historialPorAnioMap = {};
    cuotasPagosBackend.forEach((c) => {
        const anio = c.matricula?.anioAcademico?.anio;
        if (!anio || anio === anioConsultaPagos) return;
        if (!historialPorAnioMap[anio]) historialPorAnioMap[anio] = [];
        historialPorAnioMap[anio].push(c);
    });
    const historialAlumno = Object.keys(historialPorAnioMap)
        .sort((a, b) => b.localeCompare(a))
        .map((anio) => {
            const pendientes = historialPorAnioMap[anio].filter(c => c.estado === 'PENDIENTE');
            if (pendientes.length === 0) {
                return { anio, estado: 'al_dia', detalle: 'Al día' };
            }
            const totalDeuda = pendientes.reduce((sum, c) => sum + Number(c.montoCobrado), 0);
            return { anio, estado: 'pendiente', detalle: `S/ ${totalDeuda} pendiente`, monto: totalDeuda };
        });

    const deudaAnterior = historialAlumno.find(h => h.estado === 'pendiente');

    // Detalle de pagos ya realizados en el año consultado, para el modal "Historial de pagos"
    const historialPagosDetalle = cuotasAnioActual.map((c) => ({
        id: c.id,
        concepto: c.concepto,
        monto: c.monto,
        fecha: c.fechaPago ? new Date(c.fechaPago).toLocaleDateString('es-PE') : '—',
        estado: c.estadoBackend === 'PAGADO' ? 'pagado' : 'pendiente',
        recibo: c.recibo
    }));

    const totalPagadoAnioActual = historialPagosDetalle
        .filter(p => p.estado === 'pagado')
        .reduce((total, p) => total + p.monto, 0);

    const deudaPendienteAnioActual = historialPagosDetalle
        .filter(p => p.estado === 'pendiente')
        .reduce((total, p) => total + p.monto, 0);


    const pagarCuotaPagos = async (codCuota) => {
        setReciboMensaje('');
        setErrorCuotasPagos('');
        try {
            const cuotaPagada = await procesarPago(codCuota);
            setReciboMensaje(`✓ Recibo ${cuotaPagada.recibo} generado. Se registró en Auditoría.`);
            // Refresca las cuotas reales del alumno tras el pago
            const data = await listarCuotasPago(alumnoPagosSeleccionadoObj.id, null);
            setCuotasPagosBackend(data);
            setTimeout(() => setReciboMensaje(''), 4000);
        } catch (err) {
            const msg = err.response?.data;
            setErrorCuotasPagos(typeof msg === 'string' ? msg : 'No se pudo procesar el pago.');
        }
    };

    const verRecibo = (cuota) => {
        const fecha = cuota.fechaPago ? new Date(cuota.fechaPago).toLocaleDateString('es-PE') : '';
        setReciboMensaje(`ℹ Recibo de "${cuota.concepto}": ${cuota.recibo || 'sin recibo'}${fecha ? ` (pagado el ${fecha})` : ''}.`);
        setTimeout(() => setReciboMensaje(''), 4000);
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="dash-wrapper">
            <div className="dash-title-top">{tituloSuperiorPorTab[activeTab] || 'SECRETARÍA'}</div>

            <div className="dash-container">
                <header className="dash-header">
                    <div className="dash-header-left">
                        <IconIdBadge />
                        <h2>Panel secretaria</h2>
                    </div>
                    <div className="dash-header-right">
                        <span className="badge-su" style={{ backgroundColor: '#ffedd5', color: '#c2410c' }}>SE</span>
                        <span className="user-name">{currentUsername || 'secretaria'}</span>
                        <span className="role-badge role-se">secretaria</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Cerrar sesión
                    </button>
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
                        <button
                            className={`sidebar-item ${activeTab === 'reportes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('reportes')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
                            Reportes
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'clave' ? 'active' : ''}`}
                            onClick={() => setActiveTab('clave')}
                        >
                            <span className="dots">•••</span> Mi clave
                        </button>
                    </aside>

                    {activeTab === 'matricula' ? (
                        <>
                            <main className="dash-content">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 className="section-title" style={{ margin: 0 }}>Nueva matrícula</h3>
                                    <div className="filter-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ margin: 0 }}>Año académico</label>
                                        <select
                                            className="filter-select"
                                            value={anioMatricula}
                                            onChange={(e) => setAnioMatricula(e.target.value)}
                                        >
                                            <option value="2026">2026</option>
                                            <option value="2025">2025</option>
                                            <option value="2024">2024</option>
                                        </select>
                                    </div>
                                </div>


                                {cargandoDatosAcademicos && (
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '-0.5rem' }}>
                                        Cargando aulas y alumnos desde el servidor…
                                    </p>
                                )}
                                {errorCargaAcademica && (
                                    <div className="warning-banner">
                                        <IconWarning /> {errorCargaAcademica}
                                    </div>
                                )}
                                <div className="field-group">
                                    <label className="field-label">Alumno (apellidos y nombre)</label>

                                    <div className="field-with-btn">
                                        <input
                                            type="text"
                                            className="readonly-input"
                                            placeholder="Selecciona un alumno con el botón Modal"
                                            value={nombreAlumnoMatricula}
                                            onChange={(e) => {
                                                setNombreAlumnoMatricula(e.target.value)
                                                setAlumnoMatriculaSeleccionado(false);
                                            }}

                                        />

                                        <button
                                            className="modal-trigger-btn"
                                            type="button"
                                            onClick={() => setShowAlumnoModal(true)}
                                        >
                                            <IconSearch /> Modal
                                        </button>
                                    </div>
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Aula (nivel · grado · sección)</label>
                                    <div className="field-with-btn">
                                        <input
                                            type="text"
                                            className="readonly-input"
                                            readOnly
                                            placeholder="Selecciona un aula con el botón Modal"
                                            value={selectedAulaMatricula ? `${selectedAulaMatricula.nivel} ${selectedAulaMatricula.grado} ${selectedAulaMatricula.seccion}` : ''}
                                        />
                                        <button className="modal-trigger-btn" type="button" onClick={() => setShowAulaModal(true)}>
                                            <IconSearch /> Modal
                                        </button>
                                    </div>
                                </div>

                                {showAlumnoModal && activeTab === 'matricula' && (
                                    <div
                                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                                        onClick={() => setShowAlumnoModal(false)}
                                    >
                                        <div
                                            className="perm-box"
                                            style={{ background: 'white', width: '440px', maxHeight: '70vh', overflowY: 'auto', padding: '1.25rem' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <h3 className="section-title" style={{ margin: 0 }}>Buscar alumno — {anioMatricula}</h3>
                                                <button className="icon-btn" onClick={() => setShowAlumnoModal(false)}>✕</button>
                                            </div>

                                            <input
                                                type="text"
                                                className="readonly-input"
                                                placeholder="Buscar por apellido o nombre"
                                                value={nombreAlumnoMatricula}
                                                onChange={(e) => setNombreAlumnoMatricula(e.target.value)}
                                                style={{ marginBottom: '0.75rem' }}
                                            />

                                            {alumnosDisponiblesModal.length === 0 ? (
                                                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                                    No se encontraron alumnos para la búsqueda.
                                                </p>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {alumnosDisponiblesModal.map((al, idx) => (
                                                        <button
                                                            key={`${al.aud}-${al.n}-${idx}`}
                                                            type="button"
                                                            className="clickable-row"
                                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', textAlign: 'left' }}
                                                            onClick={() => seleccionarAlumnoModal(al)}
                                                        >
                                                            <span>{al.nombre}</span>
                                                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{al.aulaLabel}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {showAulaModal && (
                                    <div
                                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                                        onClick={() => setShowAulaModal(false)}
                                    >
                                        <div
                                            className="perm-box"
                                            style={{ background: 'white', width: '420px', maxHeight: '70vh', overflowY: 'auto', padding: '1.25rem' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <h3 className="section-title" style={{ margin: 0 }}>Aulas disponibles — {anioMatricula}</h3>
                                                <button className="icon-btn" onClick={() => setShowAulaModal(false)}>✕</button>
                                            </div>

                                            {aulasDisponiblesModal.length === 0 ? (
                                                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>No hay aulas disponibles para el año {anioMatricula}.</p>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {aulasDisponiblesModal.map((aula) => {
                                                        const info = estadoInfo(aula.estado);
                                                        return (
                                                            <button
                                                                key={aula.id}
                                                                type="button"
                                                                className="clickable-row"
                                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', textAlign: 'left' }}
                                                                onClick={() => seleccionarAulaModal(aula)}
                                                            >
                                                                <span>{aula.nivel} {aula.grado} "{aula.seccion}"</span>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{aula.alumnos}/{aula.cupo}</span>
                                                                    <span className={`estado-badge ${info.badgeClass}`}>{info.label}</span>
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {aulaMatriculaLlena && (
                                    <div className="warning-banner">
                                        <IconWarning /> Límite de aula: {selectedAulaMatricula.alumnos}/{selectedAulaMatricula.cupo} alumnos — llena
                                    </div>
                                )}

                                <button
                                    className="matricular-btn"
                                    type="button"
                                    disabled={aulaMatriculaLlena}
                                    onClick={abrirVerificacion2FA}
                                >
                                    <IconPersonPlus /> Matricular
                                </button>

                                {matriculaMensaje && (
                                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                                        {matriculaMensaje}
                                    </p>
                                )}

                                {showPasswordModal && (
                                    <div
                                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                                        onClick={() => setShowPasswordModal(false)}
                                    >
                                        <form
                                            className="perm-box"
                                            style={{ background: 'white', width: '380px', padding: '1.25rem' }}
                                            onClick={(e) => e.stopPropagation()}
                                            onSubmit={confirmarPassword2FA}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <IconShieldCheck /> Confirma tu identidad
                                                </h3>
                                                <button type="button" className="icon-btn" onClick={() => setShowPasswordModal(false)}>✕</button>
                                            </div>

                                            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 0, marginBottom: '1rem' }}>
                                                Por seguridad, antes de matricular a <strong>{nombreAlumnoMatricula.trim()}</strong> ingresa tu contraseña de secretaria.
                                            </p>

                                            <div className="field-group">
                                                <label className="field-label">Contraseña</label>
                                                <input
                                                    type="password"
                                                    className="readonly-input"
                                                    placeholder="Tu contraseña"
                                                    value={claveVerificacion2FA}
                                                    onChange={(e) => setClaveVerificacion2FA(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>

                                            {errorPassword2FA && (
                                                <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>{errorPassword2FA}</p>
                                            )}

                                            <button type="submit" className="matricular-btn">
                                                Continuar →
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {show2FAModal && (
                                    <div
                                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                                        onClick={() => setShow2FAModal(false)}
                                    >
                                        <form
                                            className="perm-box"
                                            style={{ background: 'white', width: '400px', padding: '1.25rem' }}
                                            onClick={(e) => e.stopPropagation()}
                                            onSubmit={confirmarCodigo2FA}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <IconShieldCheck /> Google Authenticator
                                                </h3>
                                                <button type="button" className="icon-btn" onClick={() => setShow2FAModal(false)}>✕</button>
                                            </div>

                                            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 0, marginBottom: '0.85rem' }}>
                                                Confirma la matrícula de <strong>{nombreAlumnoMatricula.trim()}</strong> con el código de tu app de autenticación.
                                            </p>

                                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
                                                <button
                                                    type="button"
                                                    className="btn-primary-outline"
                                                    style={{ flex: 1, ...(metodo2FA === 'qr' ? { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8', fontWeight: 600 } : {}) }}
                                                    onClick={() => setMetodo2FA('qr')}
                                                >
                                                    Escanear QR
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-primary-outline"
                                                    style={{ flex: 1, ...(metodo2FA === 'secreto' ? { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8', fontWeight: 600 } : {}) }}
                                                    onClick={() => setMetodo2FA('secreto')}
                                                >
                                                    Ingresar clave
                                                </button>
                                            </div>

                                            {metodo2FA === 'qr' ? (
                                                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(secreto2FA?.qrUrl || '')}`}
                                                        width={160}
                                                        height={160}
                                                        alt="Código QR para Google Authenticator"
                                                        style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.5rem' }}
                                                    />
                                                    <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.5rem', marginBottom: 0 }}>
                                                        Escanéalo con Google Authenticator, Authy u otra app TOTP.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="perm-box" style={{ background: '#f9fafb', marginBottom: '1rem', textAlign: 'center' }}>
                                                    <p style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 0.4rem 0' }}>
                                                        Clave secreta
                                                    </p>
                                                    <p style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.15em', fontSize: '1.05rem', margin: '0 0 0.65rem 0', color: '#111827' }}>
                                                        {secreto2FA?.secret ? secreto2FA.secret.match(/.{1,4}/g).join(' ') : '------'}
                                                    </p>
                                                    <button type="button" className="btn-primary-outline" onClick={copiarSecreto2FA}>
                                                        {secretoCopiado ? '✓ Copiado' : 'Copiar clave'}
                                                    </button>
                                                    <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0.65rem 0 0 0' }}>
                                                        Ingrésala manualmente en tu app como cuenta "basada en tiempo".
                                                    </p>
                                                </div>
                                            )}

                                            <div className="perm-box" style={{ textAlign: 'center', marginBottom: '1rem', background: '#f9fafb' }}>
                                                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0 0 0.3rem 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    Modo demo — código actual de Authenticator
                                                </p>
                                                <p style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.2em', margin: 0, color: '#111827' }}>
                                                    {codigoActual2FA}
                                                </p>
                                                <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0.3rem 0 0 0' }}>
                                                    se renueva en {segundosRestantes2FA}s
                                                </p>
                                            </div>

                                            <div className="field-group">
                                                <label className="field-label">Código de verificación</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={6}
                                                    className="readonly-input"
                                                    placeholder="000000"
                                                    style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.1rem' }}
                                                    value={codigo2FAInput}
                                                    onChange={(e) => setCodigo2FAInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    autoFocus
                                                />
                                            </div>

                                            {error2FA && (
                                                <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>{error2FA}</p>
                                            )}

                                            <button type="submit" className="matricular-btn">
                                                <IconShieldCheck /> Verificar y matricular
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </main>

                            <aside className="dash-permissions">
                                {!alumnoMatriculaSeleccionado ? (
                                    <div className="empty-aula-detail">
                                        Selecciona un alumno con el botón "Modal" para generar sus cuotas.
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="section-title">
                                            Cuotas generadas — {nombreAlumnoMatricula.trim()} · {anioMatricula}
                                        </h3>

                                        <table className="quota-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Concepto</th>
                                                    <th>Monto</th>
                                                    <th>Orden</th>
                                                    <th>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cuotasConEstado.map((cuota, index) => (
                                                    <tr key={cuota.id}>
                                                        <td>{index + 1}</td>
                                                        <td>{cuota.nombre}</td>
                                                        <td>S/ {cuota.monto}</td>
                                                        <td>{cuota.orden}</td>
                                                        <td>
                                                            {cuota.estadoPago === 'pagado' ? (
                                                                <span className="status-badge status-active">Pagado (P)</span>
                                                            ) : cuota.estadoPago === 'pagar' ? (
                                                                <button className="quota-pagar-btn" onClick={() => pagarCuota(cuota.id)}>Pagar</button>
                                                            ) : (
                                                                <span className="estado-badge estado-casi">bloqueado</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {primerBloqueado && (
                                            <p className="quota-note">
                                                ⓘ No se puede pagar la cuota {primerBloqueado.orden}
                                                {cuotaAnteriorAlBloqueo ? ` sin pagar la ${cuotaAnteriorAlBloqueo.orden}` : ''}
                                            </p>
                                        )}
                                    </>
                                )}
                            </aside>

                        </>
                    ) : activeTab === 'pagos' ? (
                        <>
                            <main className="dash-content">
                                <div className="filters-row">
                                    <div className="filter-group">
                                        <label>Año a consultar</label>
                                        <select
                                            className="filter-select"
                                            value={anioConsultaPagos}
                                            onChange={(e) => setAnioConsultaPagos(e.target.value)}
                                        >
                                            <option value="2026">2026</option>
                                            <option value="2025">2025</option>
                                            <option value="2024">2024</option>
                                        </select>
                                    </div>

                                    <div className="field-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label className="field-label">Alumno</label>
                                        <div className="field-with-btn">
                                            <input
                                                type="text"
                                                className="readonly-input"
                                                readOnly
                                                placeholder="Selecciona un alumno con el botón Modal"
                                                value={nombreAlumnoPagos}
                                            />
                                            <button
                                                className="modal-trigger-btn"
                                                type="button"
                                                onClick={() => setShowAlumnoModal(true)}
                                            >
                                                <IconSearch /> {nombreAlumnoPagos ? 'Cambiar alumno' : 'Modal'}
                                            </button>
                                            {nombreAlumnoPagos && (
                                                <button
                                                    className="modal-trigger-btn"
                                                    type="button"
                                                    onClick={() => setShowHistorialPagosModal(true)}
                                                >
                                                    Ver historial
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {showAlumnoModal && (
                                    <div
                                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                                        onClick={() => setShowAlumnoModal(false)}
                                    >
                                        <div
                                            className="perm-box"
                                            style={{ background: 'white', width: '440px', maxHeight: '70vh', overflowY: 'auto', padding: '1.25rem' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <h3 className="section-title" style={{ margin: 0 }}>Alumnos matriculados — {anioConsultaPagos}</h3>
                                                <button className="icon-btn" onClick={() => setShowAlumnoModal(false)}>✕</button>
                                            </div>

                                            {todosLosAlumnosPagos.length === 0 ? (
                                                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>No hay alumnos matriculados aún para el año {anioConsultaPagos}.</p>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {todosLosAlumnosPagos.map((al, idx) => (
                                                        <button
                                                            key={`${al.aud}-${al.n}-${idx}`}
                                                            type="button"
                                                            className="clickable-row"
                                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', textAlign: 'left' }}
                                                            onClick={() => seleccionarAlumnoModal(al)}
                                                        >
                                                            <span>{al.nombre}</span>
                                                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{al.aulaLabel}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {showHistorialPagosModal && (
                                    <div
                                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                                        onClick={() => setShowHistorialPagosModal(false)}
                                    >
                                        <div
                                            className="perm-box"
                                            style={{ background: 'white', width: '850px', maxHeight: '80vh', overflowY: 'auto', padding: '1.25rem' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <h3 className="section-title" style={{ margin: 0 }}>
                                                    Historial de pagos — 2025
                                                </h3>

                                                <button
                                                    type="button"
                                                    className="btn-primary-outline"
                                                    onClick={() => setShowHistorialPagosModal(false)}
                                                >
                                                    ← Volver a 2026
                                                </button>
                                            </div>

                                            <div className="warning-banner" style={{ marginBottom: '1rem' }}>
                                                Año 2025 tiene deuda pendiente — regularizar para habilitar matrícula 2026
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '1rem' }}>
                                                <table className="users-table">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Concepto</th>
                                                            <th>Monto</th>
                                                            <th>Fecha pago</th>
                                                            <th>Estado</th>
                                                            <th>Recibo / Acción</th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {historialPagosDetalle.map((pago) => (
                                                            <tr key={pago.id} className={pago.estado === 'pendiente' ? 'pagos-row-deuda' : ''}>
                                                                <td>{pago.id}</td>
                                                                <td>{pago.concepto}</td>
                                                                <td>S/ {pago.monto}</td>
                                                                <td>{pago.fecha}</td>
                                                                <td>
                                                                    {pago.estado === 'pagado' ? (
                                                                        <span className="estado-pagado-pill">pagado</span>
                                                                    ) : (
                                                                        <span className="estado-deuda-pill">pendiente</span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {pago.estado === 'pagado' ? (
                                                                        <button className="recibo-link">{pago.recibo}</button>
                                                                    ) : (
                                                                        <button className="pagar-btn-solid">Pagar ahora</button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                <div className="perm-box">
                                                    <p className="table-footer-note">Total pagado {anioConsultaPagos}</p>
                                                    <h2>S/ {totalPagadoAnioActual}</h2>

                                                    <p className="table-footer-note">Deuda pendiente</p>
                                                    <h2 style={{ color: '#991b1b' }}>S/ {deudaPendienteAnioActual}</h2>

                                                    <hr />

                                                    <p style={{ color: '#991b1b', fontWeight: 600 }}>
                                                        Matrícula 2026 bloqueada
                                                    </p>

                                                    <p className="table-footer-note">
                                                        Se desbloquea al pagar la deuda anterior.
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="table-footer-note" style={{ marginTop: '1rem' }}>
                                                Auditoría: cada pago registra usuario que operó y timestamp de inserción/modificación.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {deudaAnterior && (
                                    <div className="warning-banner">
                                        <IconWarning /> Deuda pendiente en año {deudaAnterior.anio} — S/ {deudaAnterior.monto}. No se podrá matricular en {anioConsultaPagos} hasta regularizar.
                                    </div>
                                )}

                                {cargandoCuotasPagos && (
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Cargando cuotas del alumno…</p>
                                )}
                                {errorCuotasPagos && (
                                    <div className="warning-banner"><IconWarning /> {errorCuotasPagos}</div>
                                )}

                                {!nombreAlumnoPagos ? (
                                    <div className="empty-aula-detail">
                                        👈 Selecciona un alumno con el botón "Modal" para ver sus deudas y cuotas.
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center' }}>
                                            Deudas y cuotas — {nombreAlumnoPagos} · {anioConsultaPagos}
                                            <span className="badge-anio-actual">año actual</span>
                                        </h3>

                                        <table className="pagos-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Concepto</th>
                                                    <th>Monto</th>
                                                    <th>Estado</th>
                                                    <th>Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cuotasPagosConEstado.map((cuota, index) => {
                                                    const anteriorBloqueo = cuota.estadoPago === 'bloqueado'
                                                        ? cuotasPagosConEstado.filter(c => c.orden < cuota.orden).slice(-1)[0]
                                                        : null;

                                                    return (
                                                        <tr
                                                            key={cuota.id}
                                                            className={
                                                                cuota.estadoPago === 'deuda' ? 'pagos-row-deuda' :
                                                                    cuota.estadoPago === 'bloqueado' ? 'pagos-row-bloqueado' : ''
                                                            }
                                                        >
                                                            <td>{index + 1}</td>
                                                            <td>{cuota.concepto}</td>
                                                            <td>S/ {cuota.monto}</td>
                                                            <td>
                                                                {cuota.estadoPago === 'pagado' ? (
                                                                    <span className="estado-pagado-pill">pagado</span>
                                                                ) : cuota.estadoPago === 'deuda' ? (
                                                                    <span className="estado-deuda-pill">deuda</span>
                                                                ) : (
                                                                    <span className="estado-bloqueado-pill">bloqueado</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {cuota.estadoPago === 'pagado' ? (
                                                                    <button className="recibo-link" onClick={() => verRecibo(cuota)}>Recibo</button>
                                                                ) : cuota.estadoPago === 'deuda' ? (
                                                                    <button className="pagar-btn-solid" onClick={() => pagarCuotaPagos(cuota.id)}>Pagar</button>
                                                                ) : (
                                                                    <span className="bloqueado-hint">
                                                                        requiere pagar{anteriorBloqueo ? ` cuota #${anteriorBloqueo.orden}` : ' la cuota anterior'} antes
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        <p className="pagos-footer-note">
                                            Las cuotas siguientes no podrán pagarse mientras existan cuotas anteriores pendientes.
                                        </p>

                                        {reciboMensaje && (
                                            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                                                {reciboMensaje}
                                            </p>
                                        )}

                                        <p className="mockup-caption">Vista de Pagos — pago secuencial de cuotas con generación de recibo y correlativo.</p>
                                    </>
                                )}
                            </main>

                            <aside className="dash-permissions">
                                {!nombreAlumnoPagos ? (
                                    <div className="empty-aula-detail">
                                        Selecciona un alumno para ver su historial y recibo.
                                    </div>
                                ) : (
                                    <>
                                        <div className="perm-box" style={{ marginBottom: '1.1rem' }}>
                                            <h3 className="section-title">Historial de años anteriores</h3>
                                            {historialAlumno.map((h) => (
                                                <div className="historial-row" key={h.anio}>
                                                    <span>{h.anio}</span>
                                                    {h.estado === 'pendiente' ? (
                                                        <span className="badge-pendiente-anio">{h.detalle}</span>
                                                    ) : (
                                                        <span className="badge-al-dia">{h.detalle}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="perm-box">
                                            <h3 className="section-title">Último recibo</h3>
                                            {(() => {
                                                const ultimoPagado = [...cuotasAnioActual].reverse().find(c => c.estadoBackend === 'PAGADO');
                                                return ultimoPagado ? (
                                                    <>
                                                        <p className="boleta-box-label">Correlativo de boleta</p>
                                                        <div className="boleta-input-display">{ultimoPagado.recibo}</div>
                                                    </>
                                                ) : (
                                                    <p className="table-footer-note">Aún no hay pagos registrados este año.</p>
                                                );
                                            })()}
                                            <p className="boleta-hint-text">
                                                Al confirmar pago se registra en tabla recibo y en Auditoría (usuario + fecha + cuota pagada).
                                            </p>
                                        </div>
                                    </>
                                )}
                            </aside>
                        </>
                    ) : activeTab === 'alumnos' ? (
                        <main className="dash-content" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 className="section-title">Alumnos registrados</h3>
                                    <p className="table-footer-note">
                                        Lista general de alumnos registrados.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="apply-btn"
                                    onClick={() => setShowNuevoAlumnoModal(true)}
                                >
                                    + Agregar alumno
                                </button>
                            </div>

                            <input
                                type="text"
                                className="readonly-input"
                                placeholder="Buscar por código, nombre o documento..."
                                value={busquedaAlumno}
                                onChange={(e) => setBusquedaAlumno(e.target.value)}
                                style={{ marginBottom: '1rem', maxWidth: '420px' }}
                            />

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
                                    {alumnosFiltradosGeneral.map((alumno, index) => (
                                        <tr key={alumno.id}>
                                            <td>{index + 1}</td>
                                            <td>{alumno.codigo}</td>
                                            <td>{alumno.apPaterno} {alumno.apMaterno}, {alumno.nombres}</td>
                                            <td>{alumno.tipoDoc} {alumno.documento}</td>
                                            <td>{alumno.nivel} {alumno.grado}</td>
                                            <td>
                                                <span className={`matric-badge ${matriculaBadgeClass(alumno.estado)}`}>
                                                    {alumno.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <p className="table-footer-note">
                                Mostrando {alumnosFiltradosGeneral.length} alumnos registrados.
                            </p>

                            {showNuevoAlumnoModal && (
                                <div
                                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                                    onClick={() => setShowNuevoAlumnoModal(false)}
                                >
                                    <form
                                        className="perm-box"
                                        style={{ background: 'white', width: '760px', maxHeight: '80vh', overflowY: 'auto', padding: '1.25rem' }}
                                        onClick={(e) => e.stopPropagation()}
                                        onSubmit={guardarNuevoAlumno}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h3 className="section-title" style={{ margin: 0 }}>Nuevo Alumno</h3>
                                            <button type="button" className="icon-btn" onClick={() => setShowNuevoAlumnoModal(false)}>✕</button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div className="field-group">
                                                <label className="field-label">Código</label>
                                                <input className="readonly-input" value="Autogenerado" disabled />
                                            </div>

                                            <div className="field-group">
                                                <label className="field-label">Tipo Documento *</label>
                                                <select
                                                    className="filter-select"
                                                    value={nuevoAlumno.codTipoDocumento}
                                                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, codTipoDocumento: e.target.value })}
                                                >
                                                    <option value="">Selecciona...</option>
                                                    {tiposDocumento.map((t) => (
                                                        <option key={t.codTipoDocumento} value={t.codTipoDocumento}>
                                                            {t.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="field-group">
                                                <label className="field-label">Número Documento *</label>
                                                <input
                                                    className="readonly-input"
                                                    value={nuevoAlumno.documento}
                                                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, documento: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div className="field-group">
                                                <label className="field-label">Nombres *</label>
                                                <input
                                                    className="readonly-input"
                                                    value={nuevoAlumno.nombres}
                                                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, nombres: e.target.value })}
                                                />
                                            </div>

                                            <div className="field-group">
                                                <label className="field-label">Apellido Paterno *</label>
                                                <input
                                                    className="readonly-input"
                                                    value={nuevoAlumno.apPaterno}
                                                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, apPaterno: e.target.value })}
                                                />
                                            </div>

                                            <div className="field-group">
                                                <label className="field-label">Apellido Materno *</label>
                                                <input
                                                    className="readonly-input"
                                                    value={nuevoAlumno.apMaterno}
                                                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, apMaterno: e.target.value })}
                                                />
                                            </div>

                                            <div className="field-group">
                                                <label className="field-label">Fecha de Nacimiento *</label>
                                                <input
                                                    type="date"
                                                    className="readonly-input"
                                                    value={nuevoAlumno.fechaNacimiento}
                                                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, fechaNacimiento: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {alumnoError && (
                                            <div className="warning-banner" style={{ marginBottom: '1rem' }}>
                                                {alumnoError}
                                            </div>
                                        )}

                                        <p className="table-footer-note">
                                            VALIDACIONES APLICADAS <br></br>
                                            . Tipo Documento + Número Documento -+ Unique Key (no se permite duplicar)<br></br>
                                            . Nombres / Apellidos -+ solo texto, sin caracteres especiales ni numeros<br></br>
                                            . Fecha de Nacimiento -+ formato de fecha válido<br></br>
                                        </p>

                                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                            <button
                                                type="button"
                                                className="btn-primary-outline"
                                                onClick={() => setShowNuevoAlumnoModal(false)}
                                            >
                                                Cancelar
                                            </button>

                                            <button type="submit" className="apply-btn" style={{ width: '130px' }}>
                                                Guardar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </main>
                    ) : activeTab === 'aulas' ? (
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

                                    <button className="btn-primary-outline" type="button" onClick={() => setShowNewAulaForm(v => !v)}>
                                        {showNewAulaForm ? 'Cancelar' : '+ Nueva aula'}
                                    </button>
                                </div>

                                {showNewAulaForm && (
                                    <form onSubmit={crearAula} className="perm-box" style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                                        <select
                                            value={newAula.codAnioAcademico}
                                            onChange={(e) => setNewAula({ ...newAula, codAnioAcademico: e.target.value })}
                                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                        >
                                            <option value="">Año académico...</option>
                                            {aniosCatalogo.map((a) => (
                                                <option key={a.codAnioAcademico} value={a.codAnioAcademico}>{a.anio}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={newAula.nivelNombre}
                                            onChange={(e) => setNewAula({ ...newAula, nivelNombre: e.target.value })}
                                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                        >
                                            <option value="Inicial">Inicial</option>
                                            <option value="Primaria">Primaria</option>
                                            <option value="Secundaria">Secundaria</option>
                                        </select>
                                        <input
                                            type="text"
                                            placeholder='Grado (ej. "1°" o "3 años")'
                                            value={newAula.gradoNombre}
                                            onChange={(e) => setNewAula({ ...newAula, gradoNombre: e.target.value })}
                                            required
                                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', width: '160px' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder='Sección (ej. "A")'
                                            value={newAula.seccion}
                                            onChange={(e) => setNewAula({ ...newAula, seccion: e.target.value })}
                                            maxLength={2}
                                            required
                                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', width: '90px' }}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Cupo"
                                            min="1"
                                            value={newAula.capacidadMaxima}
                                            onChange={(e) => setNewAula({ ...newAula, capacidadMaxima: e.target.value })}
                                            required
                                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', width: '90px' }}
                                        />

                                        {newAulaError && (
                                            <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0, width: '100%' }}>{newAulaError}</p>
                                        )}

                                        <button type="submit" className="apply-btn" style={{ width: 'auto', background: '#2563eb', color: 'white', border: 'none' }}>
                                            ✓ Guardar aula
                                        </button>
                                    </form>
                                )}

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
                                            <button className="ver-todos-btn" type="button" onClick={() => setShowVerTodosModal(true)}>Ver todos</button>
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

                            {showVerTodosModal && selectedAula && (
                                <div
                                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                                    onClick={() => setShowVerTodosModal(false)}
                                >
                                    <div
                                        className="perm-box"
                                        style={{ background: 'white', width: '480px', maxHeight: '75vh', overflowY: 'auto', padding: '1.25rem' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <h3 className="section-title" style={{ margin: 0 }}>
                                                {selectedAula.nivel} {selectedAula.grado} {selectedAula.seccion} — todos los alumnos
                                            </h3>
                                            <button className="icon-btn" onClick={() => setShowVerTodosModal(false)}>✕</button>
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
                                    </div>
                                </div>
                            )}
                        </>
                    ) : activeTab === 'conceptos' ? (
                        <main className="dash-content" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <IconConceptos /> Conceptos — año {anioConceptosLabel}
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <select
                                        className="filter-select"
                                        value={selectedAnioConceptoId ?? ''}
                                        onChange={(e) => setSelectedAnioConceptoId(Number(e.target.value))}
                                    >
                                        {aniosAcademicosCatalogo.map(a => (
                                            <option key={a.codAnioAcademico} value={a.codAnioAcademico}>{a.anio}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="filter-select"
                                        value={anioDestinoClonar}
                                        onChange={(e) => setAnioDestinoClonar(e.target.value)}
                                    >
                                        <option value="">Clonar a...</option>
                                        {aniosAcademicosCatalogo
                                            .filter(a => a.codAnioAcademico !== selectedAnioConceptoId)
                                            .map(a => <option key={a.codAnioAcademico} value={a.codAnioAcademico}>{a.anio}</option>)}
                                    </select>
                                    <button className="btn-primary-outline" type="button" onClick={clonarAAnioSiguiente} disabled={!anioDestinoClonar || guardandoConcepto}>
                                        ⤓ Clonar
                                    </button>
                                </div>
                            </div>

                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Concepto</th>
                                        <th>Tipo</th>
                                        <th>Monto</th>
                                        <th>Orden cobro</th>
                                        <th>Obligatorio</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conceptosDelAnio.map((concepto, index) => {
                                        const isEditing = editingConceptoId === concepto.id;

                                        return (
                                            <tr key={concepto.id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editDraft.nombre}
                                                            onChange={(e) => setEditDraft({ ...editDraft, nombre: e.target.value })}
                                                            style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', width: '120px' }}
                                                        />
                                                    ) : concepto.nombre}
                                                </td>
                                                <td>
                                                    {isEditing ? (
                                                        <select
                                                            value={editDraft.codTipoConcepto}
                                                            onChange={(e) => setEditDraft({ ...editDraft, codTipoConcepto: e.target.value })}
                                                            style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                                        >
                                                            {tiposConceptoCatalogo.map(t => <option key={t.codTipoConcepto} value={t.codTipoConcepto}>{t.nombre}</option>)}
                                                        </select>
                                                    ) : concepto.tipo}
                                                </td>
                                                <td>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={editDraft.monto}
                                                            onChange={(e) => setEditDraft({ ...editDraft, monto: e.target.value })}
                                                            style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', width: '70px' }}
                                                        />
                                                    ) : `S/ ${concepto.monto}`}
                                                </td>
                                                <td>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={editDraft.orden}
                                                            onChange={(e) => setEditDraft({ ...editDraft, orden: e.target.value })}
                                                            style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', width: '50px' }}
                                                        />
                                                    ) : concepto.orden}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`status-badge ${concepto.obligatorio ? 'status-active' : 'status-deleted'}`}
                                                        style={{ cursor: 'pointer' }}
                                                        title="Clic para alternar"
                                                        onClick={() => toggleObligatorio(concepto)}
                                                    >
                                                        {concepto.obligatorio ? 'sí' : 'no'}
                                                    </span>
                                                </td>
                                                <td className="action-cell">
                                                    {isEditing ? (
                                                        <>
                                                            <button className="icon-btn" title="Guardar" onClick={() => saveConcepto(concepto.id)}>✓</button>{' '}
                                                            <button className="icon-btn" title="Cancelar" onClick={cancelEditConcepto}>✕</button>
                                                        </>
                                                    ) : (
                                                        <button className="icon-btn" title="Editar" onClick={() => startEditConcepto(concepto)}>✏️</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                <button className="btn-primary-outline" type="button" onClick={() => setShowNewConceptoForm(v => !v)}>
                                    {showNewConceptoForm ? 'Cancelar' : '+ Nuevo concepto'}
                                </button>
                                <span className="table-footer-note" style={{ margin: 0 }}>
                                    El orden define la secuencia de cobro — no se habilitará una cuota sin pagar la anterior
                                </span>
                            </div>

                            {showNewConceptoForm && (
                                <form onSubmit={crearConcepto} className="perm-box" style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="Nombre del concepto"
                                        value={newConcepto.nombre}
                                        onChange={(e) => setNewConcepto({ ...newConcepto, nombre: e.target.value })}
                                        required
                                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    />
                                    <select
                                        value={newConcepto.codTipoConcepto}
                                        onChange={(e) => setNewConcepto({ ...newConcepto, codTipoConcepto: e.target.value })}
                                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    >
                                        <option value="">Tipo...</option>
                                        {tiposConceptoCatalogo.map(t => <option key={t.codTipoConcepto} value={t.codTipoConcepto}>{t.nombre}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Monto (S/)"
                                        value={newConcepto.monto}
                                        onChange={(e) => setNewConcepto({ ...newConcepto, monto: e.target.value })}
                                        required
                                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', width: '110px' }}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={newConcepto.obligatorio}
                                            onChange={(e) => setNewConcepto({ ...newConcepto, obligatorio: e.target.checked })}
                                        />
                                        Obligatorio
                                    </label>
                                    <button type="submit" className="apply-btn" style={{ width: 'auto', background: '#2563eb', color: 'white', border: 'none' }}>
                                        ✓ Guardar concepto
                                    </button>
                                </form>
                            )}
                        </main>
                    ) : activeTab === 'reportes' ? (
                        <main className="dash-content" style={{ flex: 1 }}>
                            <Reportes />
                        </main>
                    ) : activeTab === 'clave' ? (
                        <main className="dash-content" style={{ flex: 1 }}>
                            <h3 className="section-title">Cambiar mi clave</h3>

                            <form onSubmit={cambiarClave} className="perm-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: '360px' }}>
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
                                    value={claveConfirmar}
                                    onChange={(e) => setClaveConfirmar(e.target.value)}
                                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                />

                                {claveError && (
                                    <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{claveError}</p>
                                )}
                                {claveExito && (
                                    <p style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>✓ Clave actualizada correctamente.</p>
                                )}

                                <button type="submit" className="apply-btn">
                                    ✓ Cambiar clave
                                </button>
                            </form>
                        </main>
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
