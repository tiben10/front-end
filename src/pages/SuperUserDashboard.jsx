import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../Styles/Dashboard.css'
import PermissionTree from './PermissionTree'; 
import { decodeJwt } from '../services/jwt';
import { logout } from '../services/authService';
import { crearUsuario as crearUsuarioApi, eliminarUsuario as eliminarUsuarioApi, cambiarPassword, restablecerPassword } from '../services/usuarioService';
// import { obtenerPermisosPorRol, aplicarPermisos } from '../services/permisoService'; // no se usa: modo simulado
// import { rolService, funcionalidadService } from '../services/catalogoService'; // no se usa: modo simulado
import { listarAuditoriaReciente, obtenerFiltrosAuditoria, buscarAuditoria } from '../services/auditoriaService';
import { obtenerParametros } from '../services/parametroService';

const PERMISOS_VACIOS = { ver: false, crear: false, editar: false, eliminar: false, imprimir: false };

// ===== DATOS SIMULADOS (sin backend) =====
const MOCK_ROLES = [
    { idRol: 1, nombreRol: 'SUPERUSUARIO', estado: true },
    { idRol: 2, nombreRol: 'DIRECTOR', estado: true },
    { idRol: 3, nombreRol: 'SECRETARIA', estado: true }
];

const MOCK_USUARIOS = [
    { idUsuario: 1, usuario: 'Admin', doc: '00000001', estado: true, rol: MOCK_ROLES[0] },
    { idUsuario: 2, usuario: 'Juan Ríos', doc: '11111111', estado: true, rol: MOCK_ROLES[1] },
    { idUsuario: 3, usuario: 'María Torres', doc: '22222222', estado: true, rol: MOCK_ROLES[2] },
    { idUsuario: 4, usuario: 'Luis Paz', doc: '33333333', estado: true, rol: MOCK_ROLES[2] }
];

const MOCK_FUNCIONALIDADES = [
    { idFuncionalidad: 1, nombre: 'Usuarios' },
    { idFuncionalidad: 2, nombre: 'Roles' },
    { idFuncionalidad: 3, nombre: 'Permisos' },
    { idFuncionalidad: 4, nombre: 'Auditoria' },
    { idFuncionalidad: 5, nombre: 'Parametros' },
    { idFuncionalidad: 6, nombre: 'Alumnos' },
    { idFuncionalidad: 7, nombre: 'Matriculas' },
    { idFuncionalidad: 8, nombre: 'Aulas' },
    { idFuncionalidad: 9, nombre: 'Pagos' },
    { idFuncionalidad: 10, nombre: 'Conceptos' }
];

// ===== REPORTES (submenu + datos simulados de vacantes) =====
const REPORTES_MENU = [
    { key: 'matricula', label: 'Reporte de Matrícula' },
    { key: 'vacantes', label: 'Reporte de Vacantes' },
    { key: 'deudas', label: 'Reporte de Deudas' },
    { key: 'caja', label: 'Reporte de Caja' }
];

const MOCK_VACANTES = [
    { aula: 1, nivel: 'Inicial', grado: '3 años', seccion: 'A', ocupados: 20, cupo: 25 },
    { aula: 2, nivel: 'Inicial', grado: '3 años', seccion: 'B', ocupados: 18, cupo: 25 },
    { aula: 3, nivel: 'Primaria', grado: '1°', seccion: 'A', ocupados: 30, cupo: 35 },
    { aula: 4, nivel: 'Secundaria', grado: '1°', seccion: 'A', ocupados: 35, cupo: 35 }
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

const SuperUserDashboard = () => {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [allFuncs, setAllFuncs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeTab, setActiveTab] = useState('usuarios');
    const [currentUsername, setCurrentUsername] = useState('admin');

    const [auditLog, setAuditLog] = useState([]);
    const [loadingAudit, setLoadingAudit] = useState(false);

    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditFiltrosOpciones, setAuditFiltrosOpciones] = useState({ modulos: [], operaciones: [], tablas: [] });
    const [auditFiltros, setAuditFiltros] = useState({ usuario: '', operacion: '', modulo: '', tabla: '', desde: '', hasta: '' });
    const [auditPage, setAuditPage] = useState(0);
    const [auditResultados, setAuditResultados] = useState({ content: [], totalElements: 0, totalPages: 0, number: 0 });
    const [loadingAuditBusqueda, setLoadingAuditBusqueda] = useState(false);
    const AUDIT_PAGE_SIZE = 10;

    const [parametrosSistema, setParametrosSistema] = useState(null);
    const [loadingParametros, setLoadingParametros] = useState(false);

    const [permissionsByRole, setPermissionsByRole] = useState({}); 
    const [loadingRolePerms, setLoadingRolePerms] = useState(false);
    const [selectedRoleForPerms, setSelectedRoleForPerms] = useState(null);
    const [roleSavedMessage, setRoleSavedMessage] = useState(false);
    const [savedMessage, setSavedMessage] = useState(false);

    const [reporteActivo, setReporteActivo] = useState('vacantes');
    const [anioReporte, setAnioReporte] = useState('2026');

    const [ownCurrentPass, setOwnCurrentPass] = useState('');
    const [ownNewPass, setOwnNewPass] = useState('');
    const [ownConfirmPass, setOwnConfirmPass] = useState('');
    const [ownPassError, setOwnPassError] = useState('');
    const [ownPassSuccess, setOwnPassSuccess] = useState(false);

    const [targetUserId, setTargetUserId] = useState('');
    const [targetNewPass, setTargetNewPass] = useState('');
    const [targetPassError, setTargetPassError] = useState('');
    const [targetPassSuccess, setTargetPassSuccess] = useState(false);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newUsuario, setNewUsuario] = useState('');
    const [newDoc, setNewDoc] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRolId, setNewRolId] = useState('');
    const [createError, setCreateError] = useState('');

    const rolesDisponibles = roles.filter(r => r.nombreRol?.toUpperCase() !== 'SUPERUSUARIO' && r.estado);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const claims = token ? decodeJwt(token) : null;
        if (claims?.sub) setCurrentUsername(claims.sub);

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);
            // SIMULACION: en vez de llamar al backend, usamos datos mock
            await new Promise(resolve => setTimeout(resolve, 300));
            setUsuarios(MOCK_USUARIOS);
            setRoles(MOCK_ROLES);
            setAllFuncs(MOCK_FUNCIONALIDADES);
            setLoading(false);
        };

        cargarDatos();
    }, []);

    useEffect(() => {
        if (rolesDisponibles.length === 0) return;
        if (!selectedRoleForPerms) setSelectedRoleForPerms(rolesDisponibles[0].idRol);
        if (!newRolId) setNewRolId(rolesDisponibles[0].idRol);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roles]);

    const cargarPermisosDeRol = useCallback(async (idRol) => {
        if (!idRol || allFuncs.length === 0) return;
        setLoadingRolePerms(true);
        // SIMULACION: no hay backend, todos los permisos parten vacios (todo sin marcar)
        await new Promise(resolve => setTimeout(resolve, 150));
        const mapa = {};
        allFuncs.forEach(func => {
            mapa[func.idFuncionalidad] = { ...PERMISOS_VACIOS };
        });
        setPermissionsByRole(prev => ({ ...prev, [idRol]: mapa }));
        setLoadingRolePerms(false);
    }, [allFuncs]);

    useEffect(() => {
        if (!selectedRoleForPerms) return;
        if (permissionsByRole[selectedRoleForPerms]) return;
        cargarPermisosDeRol(selectedRoleForPerms);
    }, [selectedRoleForPerms, permissionsByRole, cargarPermisosDeRol]);

    useEffect(() => {
        if (!selectedUser) return;
        const idRol = selectedUser.rol?.idRol;
        if (!idRol || selectedUser.rol?.nombreRol?.toUpperCase() === 'SUPERUSUARIO') return;
        if (permissionsByRole[idRol]) return;
        cargarPermisosDeRol(idRol);
    }, [selectedUser, permissionsByRole, cargarPermisosDeRol]);

    const rolePermissions = permissionsByRole[selectedRoleForPerms] || {};
    const userPermissions = selectedUser ? (permissionsByRole[selectedUser.rol?.idRol] || {}) : {};

    const handleTogglePermission = (idRol, funcId, action = 'ver') => {
        if (!idRol) return;
        setPermissionsByRole(prev => {
            const rolePerms = prev[idRol] || {};
            const currentFuncPerms = rolePerms[funcId] || { ...PERMISOS_VACIOS };
            return {
                ...prev,
                [idRol]: {
                    ...rolePerms,
                    [funcId]: {
                        ...currentFuncPerms,
                        [action]: !currentFuncPerms[action]
                    }
                }
            };
        });
    };

    const handleToggleRole = (funcId, action = 'ver') => handleTogglePermission(selectedRoleForPerms, funcId, action);
    const handleToggleUser = (funcId, action = 'ver') => handleTogglePermission(selectedUser?.rol?.idRol, funcId, action);

    const guardarPermisosDeRol = async (idRol) => {
        // SIMULACION: no hay backend, solo esperamos un momento para que se sienta real
        await new Promise(resolve => setTimeout(resolve, 300));
    };

    const applyUserPermissions = async () => {
        if (!selectedUser?.rol?.idRol) return;
        try {
            await guardarPermisosDeRol(selectedUser.rol.idRol);
            setSavedMessage(true);
            setTimeout(() => setSavedMessage(false), 2000);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudieron guardar los permisos.', 'error');
        }
    };

    const crearUsuario = async (e) => {
        e.preventDefault();
        setCreateError('');

        const usuarioLimpio = newUsuario.trim();
        if (!usuarioLimpio) {
            setCreateError('El nombre de usuario es obligatorio.');
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            setCreateError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (!newRolId) {
            setCreateError('Selecciona un rol.');
            return;
        }

        try {
            const creado = await crearUsuarioApi({
                usuario: usuarioLimpio,
                doc: newDoc.trim() || null,
                password: newPassword,
                idRol: Number(newRolId)
            });

            setUsuarios(prev => [...prev, creado]);
            setNewUsuario('');
            setNewDoc('');
            setNewPassword('');
            setNewRolId(rolesDisponibles[0]?.idRol || '');
            setShowCreateForm(false);
        } catch (err) {
            const msg = typeof err.response?.data === 'string'
                ? err.response.data
                : (err.response?.data?.message || 'No se pudo crear el usuario.');
            setCreateError(msg);
        }
    };

    const eliminarUsuario = async (user) => {
        const esSuperUsuario = user.rol?.nombreRol?.toUpperCase() === 'SUPERUSUARIO';
        if (esSuperUsuario || !user.estado) return;

        try {
            await eliminarUsuarioApi(user.idUsuario);
            setUsuarios(prev => prev.map(u =>
                u.idUsuario === user.idUsuario ? { ...u, estado: false } : u
            ));
            if (selectedUser?.idUsuario === user.idUsuario) {
                setSelectedUser(null);
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudo eliminar el usuario.', 'error');
        }
    };

        const handleLogout = () => {
        logout();
        navigate('/');
    };

    const getRoleBadgeClass = (nombreRol) => {
        switch (nombreRol?.toUpperCase()) {
            case 'SUPERUSUARIO': return 'role-su';
            case 'DIRECTOR': return 'role-di';
            case 'SECRETARIA': return 'role-se';
            default: return 'role-se';
        }
    };

    const getOperacionBadgeClass = (operacion) => {
        switch (operacion?.toUpperCase()) {
            case 'INSERT': return 'op-insert';
            case 'UPDATE': return 'op-update';
            case 'DELETE': return 'op-delete';
            case 'LOGIN': return 'op-login';
            default: return 'op-default';
        }
    };

    const exportarVacantesCSV = () => {
        const encabezado = ['Aula', 'Nivel', 'Grado', 'Sección', 'Ocupados', 'Cupo', 'Vacantes', 'Estado'];
        const filas = MOCK_VACANTES.map(v => {
            const vacantes = v.cupo - v.ocupados;
            const estado = getEstadoVacante(v.ocupados, v.cupo);
            return [v.aula, v.nivel, v.grado, v.seccion, v.ocupados, v.cupo, vacantes, estado.label].join(',');
        });
        const csv = [encabezado.join(','), ...filas].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-vacantes-${anioReporte}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const cargarAuditoria = useCallback(async () => {
        setLoadingAudit(true);
        try {
            const data = await listarAuditoriaReciente();
            setAuditLog(data);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudo cargar la trazabilidad.', 'error');
        } finally {
            setLoadingAudit(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'trazabilidad') cargarAuditoria();
    }, [activeTab, cargarAuditoria]);

    const buscarAuditoriaCompleta = useCallback(async (page = 0) => {
        setLoadingAuditBusqueda(true);
        try {
            const data = await buscarAuditoria({
                usuario: auditFiltros.usuario || undefined,
                operacion: auditFiltros.operacion || undefined,
                modulo: auditFiltros.modulo || undefined,
                tabla: auditFiltros.tabla || undefined,
                desde: auditFiltros.desde || undefined,
                hasta: auditFiltros.hasta || undefined,
                page,
                size: AUDIT_PAGE_SIZE
            });
            setAuditResultados(data);
            setAuditPage(page);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudo buscar en la auditoría.', 'error');
        } finally {
            setLoadingAuditBusqueda(false);
        }
    }, [auditFiltros]);

    const abrirAuditoriaCompleta = async () => {
        setShowAuditModal(true);
        if (auditFiltrosOpciones.modulos.length === 0) {
            try {
                const opciones = await obtenerFiltrosAuditoria();
                setAuditFiltrosOpciones(opciones);
            } catch (err) {
                console.error(err);
            }
        }
        buscarAuditoriaCompleta(0);
    };

    const handleAuditFiltroChange = (campo, valor) => {
        setAuditFiltros(prev => ({ ...prev, [campo]: valor }));
    };

    const verDetalleAuditoria = (entry) => {
        Swal.fire({
            title: `Detalle #${entry.codAuditoria}`,
            html: `<div style="text-align:left; font-size:0.85rem;">
                <p><b>Tabla:</b> ${entry.tablaAfectada} (registro ${entry.codigoRegistro})</p>
                <p><b>Valor anterior:</b></p>
                <pre style="white-space:pre-wrap;background:#f3f4f6;padding:0.5rem;border-radius:0.375rem;">${entry.valorAnterior || '—'}</pre>
                <p><b>Valor nuevo:</b></p>
                <pre style="white-space:pre-wrap;background:#f3f4f6;padding:0.5rem;border-radius:0.375rem;">${entry.valorNuevo || '—'}</pre>
                <p><b>IP origen:</b> ${entry.ipOrigen || '—'}</p>
            </div>`
        });
    };

    const cargarParametros = useCallback(async () => {
        setLoadingParametros(true);
        try {
            const data = await obtenerParametros();
            setParametrosSistema(data);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudieron cargar los parámetros del sistema.', 'error');
        } finally {
            setLoadingParametros(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'parametros' && !parametrosSistema) cargarParametros();
    }, [activeTab, parametrosSistema, cargarParametros]);

    const handleChangeOwnPassword = async (e) => {
        e.preventDefault();
        setOwnPassError('');
        setOwnPassSuccess(false);

        if (!ownCurrentPass || !ownNewPass || !ownConfirmPass) {
            setOwnPassError('Todos los campos son obligatorios.');
            return;
        }
        if (ownNewPass.length < 6) {
            setOwnPassError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (ownNewPass !== ownConfirmPass) {
            setOwnPassError('La nueva contraseña y su confirmación no coinciden.');
            return;
        }

        try {
            await cambiarPassword({ passwordActual: ownCurrentPass, passwordNueva: ownNewPass });
            setOwnPassSuccess(true);
            setOwnCurrentPass('');
            setOwnNewPass('');
            setOwnConfirmPass('');
            setTimeout(() => setOwnPassSuccess(false), 2500);
        } catch (err) {
            const msg = typeof err.response?.data === 'string'
                ? err.response.data
                : 'No se pudo cambiar la contraseña.';
            setOwnPassError(msg);
        }
    };

    
    const handleResetUserPassword = async (e) => {
        e.preventDefault();
        setTargetPassError('');
        setTargetPassSuccess(false);

        if (!targetUserId) {
            setTargetPassError('Selecciona un usuario.');
            return;
        }
        if (targetNewPass.length < 6) {
            setTargetPassError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        try {
            await restablecerPassword(Number(targetUserId), targetNewPass);
            setTargetPassSuccess(true);
            setTargetNewPass('');
            setTimeout(() => setTargetPassSuccess(false), 2500);
        } catch (err) {
            const msg = typeof err.response?.data === 'string'
                ? err.response.data
                : 'No se pudo restablecer la contraseña.';
            setTargetPassError(msg);
        }
    };

    return (
        <div className="dash-wrapper">
            <div className="dash-title-top">SUPERUSUARIO — GESTIÓN DE USUARIOS Y PERMISOS</div>

            <div className="dash-container">
                <header className="dash-header">
                    <div className="dash-header-left">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        <h2>Panel superusuario</h2>
                    </div>
                    <div className="dash-header-right">
                        <span className="badge-su">SU</span>
                        <span className="user-name">{currentUsername}</span>
                        <span className="user-lock"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> no eliminable</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            Cerrar sesión
                        </button>
                </header>

                <div className="dash-body">
                    <aside className="dash-sidebar">
                        <button
                            className={`sidebar-item ${activeTab === 'usuarios' ? 'active' : ''}`}
                            onClick={() => setActiveTab('usuarios')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            Usuarios
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'clave' ? 'active' : ''}`}
                            onClick={() => setActiveTab('clave')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="M21 2l-9.6 9.6"></path><path d="M15.5 7.5l3 3L22 7l-3-3"></path></svg>
                            Cambiar Clave
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'permisos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('permisos')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            Permisos
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'trazabilidad' ? 'active' : ''}`}
                            onClick={() => setActiveTab('trazabilidad')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 8v4l3 3"></path><path d="M3.05 11a9 9 0 1 1 .5 4"></path><path d="M3 4v5h5"></path></svg>
                            Trazabilidad
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'parametros' ? 'active' : ''}`}
                            onClick={() => setActiveTab('parametros')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            Parámetros
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'reportes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('reportes')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
                            Reportes
                        </button>
                    </aside>

                    {activeTab === 'usuarios' ? (
                        <>
                            <main className="dash-content" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className="section-title" style={{ margin: 0 }}>Listado de usuarios</h3>
                                    <button className="apply-btn" style={{ width: 'auto', padding: '0.4rem 0.9rem' }} onClick={() => setShowCreateForm(v => !v)}>
                                        {showCreateForm ? 'Cancelar' : '+ Crear usuario'}
                                    </button>
                                </div>

                                {showCreateForm && (
                                    <form onSubmit={crearUsuario} className="perm-box" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Nombre de usuario"
                                            value={newUsuario}
                                            onChange={(e) => setNewUsuario(e.target.value)}
                                            required
                                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Número de documento (DNI, opcional)"
                                            value={newDoc}
                                            onChange={(e) => setNewDoc(e.target.value)}
                                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                        />
                                        <input
                                            type="password"
                                            placeholder="Contraseña (mín. 6 caracteres)"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                        />
                                        <select
                                            value={newRolId}
                                            onChange={(e) => setNewRolId(e.target.value)}
                                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                        >
                                            {rolesDisponibles.map(r => (
                                                <option key={r.idRol} value={r.idRol}>{r.nombreRol}</option>
                                            ))}
                                        </select>
                                        <button type="submit" className="apply-btn" style={{ background: '#2563eb', color: 'white', border: 'none' }}>
                                            ✓ Crear usuario
                                        </button>
                                        {createError && (
                                            <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{createError}</p>
                                        )}
                                    </form>
                                )}

                                {loading ? (
                                    <p>Cargando usuarios desde la base de datos...</p>
                                ) : error ? (
                                    <p style={{ color: 'red' }}>{error}</p>
                                ) : (
                                    <table className="users-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Doc</th>
                                                <th>Rol</th>
                                                <th>Estado</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usuarios.map((user) => {
                                                const isDeleted = !user.estado;
                                                const isSuperUser = user.rol?.nombreRol?.toUpperCase() === 'SUPERUSUARIO';
                                                const isSelected = selectedUser?.idUsuario === user.idUsuario;

                                                return (
                                                    <tr
                                                        key={user.idUsuario}
                                                        className={`clickable-row ${isDeleted ? "deleted-row" : ""} ${isSelected ? "selected-row" : ""}`}
                                                        onClick={() => setSelectedUser(user)}
                                                    >
                                                        <td>{user.usuario}</td>
                                                        <td className="doc-text">{user.doc || '—'}</td>
                                                        <td>
                                                            <span className={`role-badge ${getRoleBadgeClass(user.rol?.nombreRol)} ${isDeleted ? 'role-se-del' : ''}`}>
                                                                {user.rol?.nombreRol?.toLowerCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {isDeleted ? (
                                                                <span className="status-badge status-deleted">eliminado</span>
                                                            ) : (
                                                                <span className="status-badge status-active">activo</span>
                                                            )}
                                                        </td>
                                                        <td className="action-cell">
                                                            {isSuperUser ? "bloqueado" : isDeleted ? "lógico" : (
                                                                <button
                                                                    className="icon-btn"
                                                                    title="Eliminar lógicamente"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm(`¿Eliminar (lógicamente) al usuario "${user.usuario}"?`)) {
                                                                            eliminarUsuario(user);
                                                                        }
                                                                    }}
                                                                >
                                                                    ⊘
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}

                                <div className="table-footer-note">
                                    ⓘ La eliminación es lógica (trazabilidad). Para modificar permisos por rol, ve a la pestaña "Permisos".
                                </div>
                            </main>

                            <aside className="dash-permissions">
                                {!selectedUser ? (
                                    <div className="perm-box" style={{ marginTop: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
                                        <p className="perm-subtitle" style={{ margin: 0 }}>👈 Selecciona un usuario en la tabla para ver y editar sus permisos.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="perm-header">
                                            <h3 className="section-title" style={{ marginBottom: 0 }}>
                                                Permisos — {selectedUser.usuario}
                                            </h3>
                                            <span className={`role-badge ${getRoleBadgeClass(selectedUser.rol?.nombreRol)}`}>
                                                {selectedUser.rol?.nombreRol?.toLowerCase()}
                                            </span>
                                        </div>

                                        <div className="perm-box">
                                            <p className="perm-subtitle">Módulos habilitados</p>

                                            {selectedUser.rol?.nombreRol?.toUpperCase() === 'SUPERUSUARIO' ? (
                                                <p style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
                                                    El Superusuario tiene acceso total y no puede modificarse.
                                                </p>
                                            ) : loadingRolePerms && !permissionsByRole[selectedUser.rol?.idRol] ? (
                                                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Cargando permisos...</p>
                                            ) : (
                                                <>
                                                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '-0.4rem' }}>
                                                        Estos permisos aplican a todo el rol "{selectedUser.rol?.nombreRol?.toLowerCase()}", no solo a este usuario.
                                                    </p>
                                                    <PermissionTree
                                                        functionalities={allFuncs}
                                                        permissions={userPermissions}
                                                        onToggle={handleToggleUser}
                                                    />
                                                </>
                                            )}

                                            <button
                                                className="apply-btn"
                                                onClick={applyUserPermissions}
                                                disabled={selectedUser.rol?.nombreRol?.toUpperCase() === 'SUPERUSUARIO'}
                                            >
                                                ✓ Aplicar permisos
                                            </button>

                                            {savedMessage && (
                                                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                                                    ✓ Permisos actualizados para el rol {selectedUser.rol?.nombreRol?.toLowerCase()}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </aside>
                        </>
                    ) : activeTab === 'clave' ? (
                        <main className="dash-content dash-content-full">
                            <h3 className="section-title">Cambiar Clave</h3>

                            <div className="perm-box" style={{ marginBottom: '1.5rem' }}>
                                <p className="perm-subtitle">Mi clave (Superusuario)</p>
                                <form onSubmit={handleChangeOwnPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: '360px' }}>
                                    <input
                                        type="password"
                                        placeholder="Contraseña actual"
                                        value={ownCurrentPass}
                                        onChange={(e) => setOwnCurrentPass(e.target.value)}
                                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    />
                                    <input
                                        type="password"
                                        placeholder="Nueva contraseña"
                                        value={ownNewPass}
                                        onChange={(e) => setOwnNewPass(e.target.value)}
                                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirmar nueva contraseña"
                                        value={ownConfirmPass}
                                        onChange={(e) => setOwnConfirmPass(e.target.value)}
                                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    />
                                    <button type="submit" className="apply-btn">
                                        ✓ Cambiar mi clave
                                    </button>
                                    {ownPassError && (
                                        <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{ownPassError}</p>
                                    )}
                                    {ownPassSuccess && (
                                        <p style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>✓ Clave actualizada correctamente.</p>
                                    )}
                                </form>
                            </div>

                            <div className="perm-box">
                                <p className="perm-subtitle">Restablecer clave de otro usuario</p>
                                <form onSubmit={handleResetUserPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: '360px' }}>
                                    <select
                                        value={targetUserId}
                                        onChange={(e) => setTargetUserId(e.target.value)}
                                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    >
                                        <option value="">Selecciona un usuario...</option>
                                        {usuarios.filter(u => u.estado).map(u => (
                                            <option key={u.idUsuario} value={u.idUsuario}>
                                                {u.usuario} ({u.rol?.nombreRol?.toLowerCase()})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="password"
                                        placeholder="Nueva contraseña para el usuario"
                                        value={targetNewPass}
                                        onChange={(e) => setTargetNewPass(e.target.value)}
                                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                    />
                                    <button type="submit" className="apply-btn">
                                        ✓ Restablecer clave
                                    </button>
                                    {targetPassError && (
                                        <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{targetPassError}</p>
                                    )}
                                    {targetPassSuccess && (
                                        <p style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>✓ Clave restablecida correctamente.</p>
                                    )}
                                </form>
                            </div>
                        </main>
                    ) : activeTab === 'permisos' ? (
                        <>
                            <main className="dash-content" style={{ flex: 1 }}>
                                <h3 className="section-title" style={{ marginBottom: '1rem' }}>Usuarios</h3>
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Rol</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.filter(u => u.estado).map(user => {
                                            const isSelected = selectedUser?.idUsuario === user.idUsuario;
                                            return (
                                                <tr
                                                    key={user.idUsuario}
                                                    className={`clickable-row ${isSelected ? 'selected-row' : ''}`}
                                                    onClick={() => setSelectedUser(user)}
                                                >
                                                    <td>{user.usuario}</td>
                                                    <td>
                                                        <span className={`role-badge ${getRoleBadgeClass(user.rol?.nombreRol)}`}>
                                                            {user.rol?.nombreRol?.toLowerCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </main>

                            <aside className="dash-permissions">
                                {!selectedUser ? (
                                    <div className="perm-box" style={{ marginTop: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
                                        <p className="perm-subtitle" style={{ margin: 0 }}>👈 Selecciona un usuario en la tabla para ver y editar sus permisos.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="perm-header">
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                            <h3 className="section-title" style={{ marginBottom: 0 }}>
                                                Permisos — {selectedUser.usuario}
                                            </h3>
                                            <span className={`role-badge ${getRoleBadgeClass(selectedUser.rol?.nombreRol)}`}>
                                                {selectedUser.rol?.nombreRol?.toLowerCase()}
                                            </span>
                                        </div>

                                        <div className="perm-box">
                                            {selectedUser.rol?.nombreRol?.toUpperCase() === 'SUPERUSUARIO' ? (
                                                <p style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
                                                    El Superusuario tiene acceso total y no puede modificarse.
                                                </p>
                                            ) : loadingRolePerms && !permissionsByRole[selectedUser.rol?.idRol] ? (
                                                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Cargando permisos...</p>
                                            ) : (
                                                <>
                                                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '-0.4rem' }}>
                                                        Estos permisos aplican a todo el rol "{selectedUser.rol?.nombreRol?.toLowerCase()}", no solo a este usuario.
                                                    </p>
                                                    <PermissionTree
                                                        functionalities={allFuncs}
                                                        permissions={userPermissions}
                                                        onToggle={handleToggleUser}
                                                    />
                                                </>
                                            )}

                                            <button
                                                className="apply-btn"
                                                onClick={applyUserPermissions}
                                                disabled={selectedUser.rol?.nombreRol?.toUpperCase() === 'SUPERUSUARIO'}
                                            >
                                                ✓ Aplicar permisos
                                            </button>

                                            {savedMessage && (
                                                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                                                    ✓ Permisos actualizados para el rol {selectedUser.rol?.nombreRol?.toLowerCase()}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </aside>
                        </>
                    ) : activeTab === 'trazabilidad' ? (
                        <main className="dash-content dash-content-full">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <h3 className="section-title" style={{ margin: 0 }}>Trazabilidad</h3>
                                <button className="apply-btn" style={{ width: 'auto', padding: '0.4rem 0.9rem' }} onClick={abrirAuditoriaCompleta}>
                                    🔍 Auditoría completa
                                </button>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0', marginBottom: '1rem' }}>
                                Últimos 10 registros. Para buscar por usuario, operación, módulo, tabla o rango de fechas, usa "Auditoría completa".
                            </p>

                            {loadingAudit ? (
                                <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Cargando trazabilidad...</p>
                            ) : auditLog.length === 0 ? (
                                <div className="audit-empty">
                                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="1.5" fill="none"><path d="M12 8v4l3 3"></path><path d="M3.05 11a9 9 0 1 1 .5 4"></path><path d="M3 4v5h5"></path></svg>
                                    <p>Aún no hay acciones registradas.</p>
                                </div>
                            ) : (
                                <div className="audit-recent-wrap">
                                    <table className="audit-table">
                                        <thead>
                                            <tr>
                                                <th>Usuario</th>
                                                <th>Fecha</th>
                                                <th>Acción</th>
                                                <th>Módulo</th>
                                                <th>Registro Afectado</th>
                                                <th>Detalle</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLog.map(entry => (
                                                <tr key={entry.codAuditoria}>
                                                    <td className="audit-user">{entry.usuario?.usuario || '—'}</td>
                                                    <td className="audit-date">{entry.fechaHora ? new Date(entry.fechaHora).toLocaleString('es-PE') : '—'}</td>
                                                    <td><span className={`audit-op-badge ${getOperacionBadgeClass(entry.operacion)}`}>{entry.operacion}</span></td>
                                                    <td><span className="audit-tag">{entry.modulo}</span></td>
                                                    <td className="audit-registro">{entry.tablaAfectada} #{entry.codigoRegistro}</td>
                                                    <td>
                                                        <button className="audit-ver-btn" onClick={() => verDetalleAuditoria(entry)}>Ver</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="table-footer-note">
                                ⓘ Este historial es solo de consulta, no se puede editar ni eliminar.
                            </div>
                        </main>
                    ) : activeTab === 'parametros' ? (
                        <main className="dash-content dash-content-full">
                            <h3 className="section-title">Parámetros del sistema</h3>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                Solo lectura: estos valores no viven en una tabla de configuración genérica, sino que reflejan
                                reglas que ya existen.
                            </p>

                            {loadingParametros || !parametrosSistema ? (
                                <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Cargando parámetros...</p>
                            ) : (
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Parámetro</th>
                                            <th>Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Mínimo de caracteres para contraseña</td>
                                            <td>{parametrosSistema.minLongitudPassword}</td>
                                        </tr>
                                        <tr>
                                            <td>Expiración de sesión (minutos)</td>
                                            <td>{parametrosSistema.expiracionSesionMinutos}</td>
                                        </tr>
                                        <tr>
                                            <td>Vacantes máximas por aula</td>
                                            <td style={{ fontSize: '0.85rem' }}>{parametrosSistema.vacantesPorAulaInfo}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </main>
                    ) : activeTab === 'reportes' ? (
                        <main className="dash-content dash-content-full">
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
                                                <table className="users-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Aula</th><th>Nivel</th><th>Grado</th><th>Sección</th>
                                                            <th>Ocupados</th><th>Cupo</th><th>Vacantes</th><th>Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {MOCK_VACANTES.map(v => {
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
                                                    </tbody>
                                                </table>
                                                <p className="table-footer-note">
                                                    ⓘ Total vacantes: <strong>{MOCK_VACANTES.reduce((acc, v) => acc + (v.cupo - v.ocupados), 0)}</strong>. Se recomienda abrir nuevas secciones si la demanda supera el 90% de ocupación.
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="perm-box" style={{ textAlign: 'center', borderStyle: 'dashed', color: '#6b7280' }}>
                                            <p style={{ margin: 0, fontSize: '0.85rem' }}>
                                                {REPORTES_MENU.find(r => r.key === reporteActivo)?.label} — se implementará más adelante.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </main>
                    ) : (
                        <main className="dash-content dash-content-full">
                            <h3 className="section-title">Próximamente</h3>
                            <p>Esta sección ({activeTab}) se implementará más adelante.</p>
                        </main>
                    )}
                </div>
            </div>

            {showAuditModal && (
                <div className="audit-modal-overlay" onClick={() => setShowAuditModal(false)}>
                    <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="audit-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                <strong>AUDITORÍA — TRAZABILIDAD COMPLETA</strong>
                            </div>
                            <button className="icon-btn" title="Cerrar" onClick={() => setShowAuditModal(false)}>✕</button>
                        </div>

                        <div className="audit-filters">
                            <div>
                                <label>Usuario</label>
                                <select value={auditFiltros.usuario} onChange={(e) => handleAuditFiltroChange('usuario', e.target.value)}>
                                    <option value="">Todos</option>
                                    {usuarios.map(u => (
                                        <option key={u.idUsuario} value={u.usuario}>{u.usuario}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Tipo de Operación</label>
                                <select value={auditFiltros.operacion} onChange={(e) => handleAuditFiltroChange('operacion', e.target.value)}>
                                    <option value="">Todos</option>
                                    {auditFiltrosOpciones.operaciones.map(op => (
                                        <option key={op} value={op}>{op}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Módulo</label>
                                <select value={auditFiltros.modulo} onChange={(e) => handleAuditFiltroChange('modulo', e.target.value)}>
                                    <option value="">Todos</option>
                                    {auditFiltrosOpciones.modulos.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Tabla</label>
                                <select value={auditFiltros.tabla} onChange={(e) => handleAuditFiltroChange('tabla', e.target.value)}>
                                    <option value="">Todas</option>
                                    {auditFiltrosOpciones.tablas.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Desde</label>
                                <input type="date" value={auditFiltros.desde} onChange={(e) => handleAuditFiltroChange('desde', e.target.value)} />
                            </div>
                            <div>
                                <label>Hasta</label>
                                <input type="date" value={auditFiltros.hasta} onChange={(e) => handleAuditFiltroChange('hasta', e.target.value)} />
                            </div>
                            <button className="apply-btn" style={{ width: 'auto', alignSelf: 'end' }} onClick={() => buscarAuditoriaCompleta(0)}>
                                🔍 Buscar
                            </button>
                        </div>

                        <div className="audit-table-wrap">
                            {loadingAuditBusqueda ? (
                                <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Buscando...</p>
                            ) : auditResultados.content.length === 0 ? (
                                <div className="audit-empty">
                                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="1.5" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    <p>No se encontraron registros con esos filtros.</p>
                                </div>
                            ) : (
                                <table className="audit-table">
                                    <thead>
                                        <tr>
                                            <th>N°</th>
                                            <th>Fecha y Hora</th>
                                            <th>Usuario</th>
                                            <th>Módulo</th>
                                            <th>Tabla</th>
                                            <th>Operación</th>
                                            <th>Registro Afectado</th>
                                            <th>Detalle</th>
                                            <th>IP Origen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditResultados.content.map((entry, idx) => (
                                            <tr key={entry.codAuditoria}>
                                                <td className="audit-num">{auditResultados.number * AUDIT_PAGE_SIZE + idx + 1}</td>
                                                <td className="audit-date">{entry.fechaHora ? new Date(entry.fechaHora).toLocaleString('es-PE') : '—'}</td>
                                                <td className="audit-user">{entry.usuario?.usuario || '—'}</td>
                                                <td><span className="audit-tag">{entry.modulo}</span></td>
                                                <td><span className="audit-tag audit-tag-muted">{entry.tablaAfectada}</span></td>
                                                <td><span className={`audit-op-badge ${getOperacionBadgeClass(entry.operacion)}`}>{entry.operacion}</span></td>
                                                <td className="audit-registro">{entry.tablaAfectada} #{entry.codigoRegistro}</td>
                                                <td>
                                                    <button className="audit-ver-btn" onClick={() => verDetalleAuditoria(entry)}>Ver</button>
                                                </td>
                                                <td className="audit-ip">{entry.ipOrigen}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="audit-pagination">
                            <span>
                                Mostrando página <strong>{auditResultados.number + 1}</strong> de <strong>{Math.max(auditResultados.totalPages, 1)}</strong> — {auditResultados.totalElements} registros en total
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="audit-page-btn"
                                    disabled={auditPage === 0}
                                    onClick={() => buscarAuditoriaCompleta(auditPage - 1)}
                                >
                                    ‹ Anterior
                                </button>
                                <button
                                    className="audit-page-btn"
                                    disabled={auditPage + 1 >= auditResultados.totalPages}
                                    onClick={() => buscarAuditoriaCompleta(auditPage + 1)}
                                >
                                    Siguiente ›
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperUserDashboard;
