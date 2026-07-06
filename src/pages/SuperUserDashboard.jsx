import React, { useState, useEffect } from 'react';
import '../Styles/Dashboard.css'
import PermissionTree from './PermissionTree'; // <-- Importamos el componente del árbol

const SuperUserDashboard = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [allFuncs, setAllFuncs] = useState([]); // <-- Nuevo estado para las funcionalidades
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeTab, setActiveTab] = useState('usuarios');

    // --- Trazabilidad / Auditoría: registro automático de acciones (solo en memoria) ---
    const [auditLog, setAuditLog] = useState([]);

    // --- Parámetros del sistema (clave-valor, editable) ---
    const [parametros, setParametros] = useState([
        { id: 1, nombre: 'Máximo de vacantes por aula', valor: '30' },
        { id: 2, nombre: 'Mínimo de caracteres para contraseña', valor: '8' },
        { id: 3, nombre: 'Expiración de sesión (minutos)', valor: '30' }
    ]);
    const [editingParamId, setEditingParamId] = useState(null);
    const [editingParamValue, setEditingParamValue] = useState('');

    // --- Permisos por ROL (Permisos tab): idRol/nombreRol -> { idFuncionalidad: {...} } ---
    const [permissionsByRole, setPermissionsByRole] = useState({});
    const [selectedRoleForPerms, setSelectedRoleForPerms] = useState('DIRECTOR');
    const [roleSavedMessage, setRoleSavedMessage] = useState(false);

    // --- Permisos por USUARIO (pestaña Usuarios): idUsuario -> { idFuncionalidad: {...} } ---
    // Se inicializan copiando los permisos del ROL del usuario la primera vez que se selecciona.
    const [permissionsByUser, setPermissionsByUser] = useState({});
    const [savedMessage, setSavedMessage] = useState(false);

    // --- Cambiar mi propia clave (Superusuario) ---
    const [ownCurrentPass, setOwnCurrentPass] = useState('');
    const [ownNewPass, setOwnNewPass] = useState('');
    const [ownConfirmPass, setOwnConfirmPass] = useState('');
    const [ownPassError, setOwnPassError] = useState('');
    const [ownPassSuccess, setOwnPassSuccess] = useState(false);

    // --- Cambiar la clave de otro usuario (reseteo administrativo) ---
    const [targetUserId, setTargetUserId] = useState('');
    const [targetNewPass, setTargetNewPass] = useState('');
    const [targetPassError, setTargetPassError] = useState('');
    const [targetPassSuccess, setTargetPassSuccess] = useState(false);

    // --- Crear usuario (simulado, solo en memoria) ---
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newUsuario, setNewUsuario] = useState('');
    const [newDoc, setNewDoc] = useState('');
    const [newRolId, setNewRolId] = useState(3); // por defecto Secretaria
    const [createError, setCreateError] = useState('');

    const rolesDisponibles = [
        { idRol: 2, nombreRol: 'DIRECTOR' },
        { idRol: 3, nombreRol: 'SECRETARIA' }
    ];

    // Carga inicial de Usuarios y Funcionalidades
    useEffect(() => {
        const mockUsuarios = [
            { idUsuario: 1, usuario: 'admin', doc: null, estado: true, rol: { idRol: 1, nombreRol: 'SUPERUSUARIO' } },
            { idUsuario: 2, usuario: 'Juan Ríos', doc: '47112233', estado: true, rol: { idRol: 2, nombreRol: 'DIRECTOR' } },
            { idUsuario: 3, usuario: 'María Torres', doc: '52009871', estado: true, rol: { idRol: 3, nombreRol: 'SECRETARIA' } },
            { idUsuario: 4, usuario: 'Luis Paz', doc: '31007654', estado: false, rol: { idRol: 3, nombreRol: 'SECRETARIA' } }
        ];

        const mockFuncs = [
            { idFuncionalidad: 1, nombre: 'Matriculas' },
            { idFuncionalidad: 2, nombre: 'Pagos' },
            { idFuncionalidad: 3, nombre: 'Alumnos' },
            { idFuncionalidad: 4, nombre: 'Aulas' },
            { idFuncionalidad: 5, nombre: 'Conceptos' },
            { idFuncionalidad: 6, nombre: 'Usuarios' },
            { idFuncionalidad: 7, nombre: 'Reportes Avanzados' }
        ];

        setUsuarios(mockUsuarios);
        setAllFuncs(mockFuncs);
        setLoading(false);
    }, []);

    // Inicializa el mapa de permisos por Rol (Director/Secretaria) una sola vez, todo en false por defecto
    useEffect(() => {
        if (allFuncs.length === 0) return;
        setPermissionsByRole(prev => {
            const roles = ['DIRECTOR', 'SECRETARIA'];
            const faltantes = roles.filter(r => !prev[r]);
            if (faltantes.length === 0) return prev;

            const next = { ...prev };
            faltantes.forEach(rol => {
                const map = {};
                allFuncs.forEach(func => {
                    map[func.idFuncionalidad] = { ver: false, crear: false, editar: false, eliminar: false, imprimir: false };
                });
                next[rol] = map;
            });
            return next;
        });
    }, [allFuncs]);

    // Permisos del rol actualmente seleccionado en la pestaña "Permisos" (atajo de lectura)
    const rolePermissions = permissionsByRole[selectedRoleForPerms] || {};

    // Toggle de un permiso para el ROL seleccionado (afecta a TODOS los usuarios de ese rol)
    const handleToggleRole = (funcId, action = 'ver') => {
        setPermissionsByRole(prev => {
            const rolePerms = prev[selectedRoleForPerms] || {};
            const currentFuncPerms = rolePerms[funcId] || { ver: false, crear: false, editar: false, eliminar: false, imprimir: false };
            return {
                ...prev,
                [selectedRoleForPerms]: {
                    ...rolePerms,
                    [funcId]: {
                        ...currentFuncPerms,
                        [action]: !currentFuncPerms[action]
                    }
                }
            };
        });
    };

    // Solo simula el guardado de permisos por rol: no llama a ninguna API.
    const applyRolePermissions = () => {
        setRoleSavedMessage(true);
        setTimeout(() => setRoleSavedMessage(false), 2000);
        logAction('Editar', 'Permisos', `Actualizó los permisos del rol ${selectedRoleForPerms.toLowerCase()}`);
    };

    // Al seleccionar un usuario en la pestaña "Usuarios": si es la primera vez, copia los permisos de su ROL como punto de partida.
    // Si ya se había tocado antes en esta sesión, se respeta lo que quedó marcado para ese usuario.
    useEffect(() => {
        if (!selectedUser || allFuncs.length === 0) return;
        const rolNombre = selectedUser.rol?.nombreRol?.toUpperCase();
        if (rolNombre === 'SUPERUSUARIO') return;

        setPermissionsByUser(prev => {
            if (prev[selectedUser.idUsuario]) return prev; // ya existe, no lo pisamos
            const base = permissionsByRole[rolNombre] || {};
            const copia = {};
            allFuncs.forEach(func => {
                copia[func.idFuncionalidad] = { ...(base[func.idFuncionalidad] || { ver: false, crear: false, editar: false, eliminar: false, imprimir: false }) };
            });
            return { ...prev, [selectedUser.idUsuario]: copia };
        });
    }, [selectedUser, allFuncs, permissionsByRole]);

    // Permisos del usuario actualmente seleccionado en "Usuarios" (atajo de lectura)
    const userPermissions = selectedUser ? (permissionsByUser[selectedUser.idUsuario] || {}) : {};

    // Toggle de un permiso para el USUARIO seleccionado (solo afecta a ese usuario, no a todo el rol)
    const handleToggleUser = (funcId, action = 'ver') => {
        if (!selectedUser) return;
        setPermissionsByUser(prev => {
            const userPerms = prev[selectedUser.idUsuario] || {};
            const currentFuncPerms = userPerms[funcId] || { ver: false, crear: false, editar: false, eliminar: false, imprimir: false };
            return {
                ...prev,
                [selectedUser.idUsuario]: {
                    ...userPerms,
                    [funcId]: {
                        ...currentFuncPerms,
                        [action]: !currentFuncPerms[action]
                    }
                }
            };
        });
    };

    // Solo simula el guardado de permisos por usuario: no llama a ninguna API.
    const applyUserPermissions = () => {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 2000);
        logAction('Editar', 'Permisos', `Actualizó los permisos del usuario "${selectedUser.usuario}"`);
    };

    // Crea un usuario nuevo SOLO en memoria (no llama a ninguna API, no persiste al recargar)
    const crearUsuario = (e) => {
        e.preventDefault();
        setCreateError('');

        const usuarioLimpio = newUsuario.trim();
        if (!usuarioLimpio) {
            setCreateError('El nombre de usuario es obligatorio.');
            return;
        }

        // Validación Unique Key: no puede repetirse el nombre de usuario (comparación sin distinguir mayúsculas)
        const yaExiste = usuarios.some(u => u.usuario.trim().toLowerCase() === usuarioLimpio.toLowerCase());
        if (yaExiste) {
            setCreateError(`Ya existe un usuario con el nombre "${usuarioLimpio}".`);
            return;
        }

        const rolSeleccionado = rolesDisponibles.find(r => r.idRol === Number(newRolId));
        const nuevoId = usuarios.length > 0 ? Math.max(...usuarios.map(u => u.idUsuario)) + 1 : 1;

        const nuevoUsuario = {
            idUsuario: nuevoId,
            usuario: usuarioLimpio,
            doc: newDoc.trim() || null,
            estado: true,
            rol: rolSeleccionado
        };

        setUsuarios(prev => [...prev, nuevoUsuario]);
        logAction('Crear', 'Usuarios', `Creó al usuario "${usuarioLimpio}" con rol ${rolSeleccionado.nombreRol.toLowerCase()}`);

        // Reset del formulario
        setNewUsuario('');
        setNewDoc('');
        setNewRolId(3);
        setShowCreateForm(false);
    };

    // Elimina lógicamente a un usuario (solo cambia estado en memoria, no borra el registro ni llama a backend)
    const eliminarUsuario = (user) => {
        const esSuperUsuario = user.rol?.nombreRol?.toUpperCase() === 'SUPERUSUARIO';
        if (esSuperUsuario || !user.estado) return; // bloqueado o ya eliminado

        setUsuarios(prev => prev.map(u =>
            u.idUsuario === user.idUsuario ? { ...u, estado: false } : u
        ));
        logAction('Eliminar', 'Usuarios', `Eliminó (lógicamente) al usuario "${user.usuario}"`);

        // Si el usuario eliminado estaba seleccionado, quitamos la selección
        if (selectedUser?.idUsuario === user.idUsuario) {
            setSelectedUser(null);
        }
    };

    const getRoleBadgeClass = (nombreRol) => {
        switch (nombreRol?.toUpperCase()) {
            case 'SUPERUSUARIO': return 'role-su';
            case 'DIRECTOR': return 'role-di';
            case 'SECRETARIA': return 'role-se';
            default: return 'role-se';
        }
    };

    // Agrega un registro al historial de trazabilidad (solo en memoria, el más reciente primero)
    const logAction = (accion, modulo, detalle) => {
        setAuditLog(prev => [
            {
                id: prev.length + 1,
                usuario: 'admin',
                fecha: new Date().toLocaleString('es-PE'),
                accion,
                modulo,
                detalle
            },
            ...prev
        ]);
    };

    // Abre el modo edición para un parámetro específico
    const startEditParam = (param) => {
        setEditingParamId(param.id);
        setEditingParamValue(param.valor);
    };

    // Guarda el nuevo valor del parámetro en memoria y lo registra en Trazabilidad
    const saveParam = (param) => {
        const valorLimpio = editingParamValue.trim();
        if (!valorLimpio) return;

        setParametros(prev => prev.map(p =>
            p.id === param.id ? { ...p, valor: valorLimpio } : p
        ));
        logAction('Editar', 'Parámetros', `Cambió "${param.nombre}" de "${param.valor}" a "${valorLimpio}"`);

        setEditingParamId(null);
        setEditingParamValue('');
    };

    // Cambia mi propia clave (Superusuario). Solo valida en memoria, no llama a ningún backend.
    const handleChangeOwnPassword = (e) => {
        e.preventDefault();
        setOwnPassError('');
        setOwnPassSuccess(false);

        if (!ownCurrentPass || !ownNewPass || !ownConfirmPass) {
            setOwnPassError('Todos los campos son obligatorios.');
            return;
        }
        if (ownNewPass.length < 8) {
            setOwnPassError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (ownNewPass !== ownConfirmPass) {
            setOwnPassError('La nueva contraseña y su confirmación no coinciden.');
            return;
        }

        setOwnPassSuccess(true);
        setOwnCurrentPass('');
        setOwnNewPass('');
        setOwnConfirmPass('');
        setTimeout(() => setOwnPassSuccess(false), 2500);
        logAction('Editar', 'Cambiar Clave', 'Cambió su propia contraseña (Superusuario)');
    };

    // Resetea la clave de otro usuario seleccionado en el combo. Solo simulado en memoria.
    const handleResetUserPassword = (e) => {
        e.preventDefault();
        setTargetPassError('');
        setTargetPassSuccess(false);

        if (!targetUserId) {
            setTargetPassError('Selecciona un usuario.');
            return;
        }
        if (targetNewPass.length < 8) {
            setTargetPassError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setTargetPassSuccess(true);
        setTargetNewPass('');
        setTimeout(() => setTargetPassSuccess(false), 2500);

        const targetUser = usuarios.find(u => u.idUsuario === Number(targetUserId));
        logAction('Editar', 'Cambiar Clave', `Restableció la contraseña del usuario "${targetUser?.usuario || targetUserId}"`);
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
                        <span className="user-name">admin</span>
                        <span className="user-lock"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> no eliminable</span>
                    </div>
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
                            className={`sidebar-item ${activeTab === 'permisos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('permisos')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            Permisos
                        </button>
                        <button
                            className={`sidebar-item ${activeTab === 'clave' ? 'active' : ''}`}
                            onClick={() => setActiveTab('clave')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="M21 2l-9.6 9.6"></path><path d="M15.5 7.5l3 3L22 7l-3-3"></path></svg>
                            Cambiar Clave
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
                                            placeholder="Número de documento (opcional)"
                                            value={newDoc}
                                            onChange={(e) => setNewDoc(e.target.value)}
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
                                            ) : (
                                                <PermissionTree
                                                    functionalities={allFuncs}
                                                    permissions={userPermissions}
                                                    onToggle={handleToggleUser}
                                                />
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
                                                    ✓ Permisos actualizados para {selectedUser.usuario}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </aside>
                        </>
                    ) : activeTab === 'permisos' ? (
                        <main className="dash-content" style={{ flex: 1 }}>
                            <h3 className="section-title">Permisos por Rol</h3>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                Los permisos se asignan por Rol: afectan a todos los usuarios que tengan ese rol.
                            </p>

                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                {['DIRECTOR', 'SECRETARIA'].map(rol => (
                                    <button
                                        key={rol}
                                        onClick={() => setSelectedRoleForPerms(rol)}
                                        className={`role-badge ${getRoleBadgeClass(rol)}`}
                                        style={{
                                            cursor: 'pointer',
                                            border: selectedRoleForPerms === rol ? '2px solid #1f2937' : '2px solid transparent',
                                            fontWeight: 600
                                        }}
                                    >
                                        {rol.charAt(0) + rol.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>

                            <div className="perm-box">
                                <p className="perm-subtitle">Módulos habilitados para {selectedRoleForPerms.charAt(0) + selectedRoleForPerms.slice(1).toLowerCase()}</p>

                                <PermissionTree
                                    functionalities={allFuncs}
                                    permissions={rolePermissions}
                                    onToggle={handleToggleRole}
                                />

                                <button className="apply-btn" onClick={applyRolePermissions}>
                                    ✓ Aplicar cambios
                                </button>

                                {roleSavedMessage && (
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                                        ✓ Permisos actualizados para el rol {selectedRoleForPerms.toLowerCase()}
                                    </p>
                                )}
                            </div>
                        </main>
                    ) : activeTab === 'clave' ? (
                        <main className="dash-content">
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
                    ) : activeTab === 'trazabilidad' ? (
                        <main className="dash-content" style={{ flex: 1 }}>
                            <h3 className="section-title">Trazabilidad</h3>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                Registro de solo lectura: quién hizo qué acción y cuándo. Se genera automáticamente con lo que hagas en el panel.
                            </p>

                            {auditLog.length === 0 ? (
                                <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Aún no hay acciones registradas en esta sesión.</p>
                            ) : (
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Usuario</th>
                                            <th>Fecha</th>
                                            <th>Acción</th>
                                            <th>Módulo</th>
                                            <th>Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLog.map(entry => (
                                            <tr key={entry.id}>
                                                <td>{entry.usuario}</td>
                                                <td className="doc-text">{entry.fecha}</td>
                                                <td>{entry.accion}</td>
                                                <td>{entry.modulo}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{entry.detalle}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            <div className="table-footer-note">
                                ⓘ Este historial es solo de consulta, no se puede editar ni eliminar.
                            </div>
                        </main>
                    ) : activeTab === 'parametros' ? (
                        <main className="dash-content" style={{ flex: 1 }}>
                            <h3 className="section-title">Parámetros del sistema</h3>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                Valores de configuración usados en las validaciones del sistema (ej. vacantes máximas en Matrícula).
                            </p>

                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Parámetro</th>
                                        <th>Valor</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parametros.map(param => (
                                        <tr key={param.id}>
                                            <td>{param.nombre}</td>
                                            <td>
                                                {editingParamId === param.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingParamValue}
                                                        onChange={(e) => setEditingParamValue(e.target.value)}
                                                        style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', width: '100px' }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    param.valor
                                                )}
                                            </td>
                                            <td className="action-cell">
                                                {editingParamId === param.id ? (
                                                    <>
                                                        <button className="icon-btn" title="Guardar" onClick={() => saveParam(param)}>✓</button>{' '}
                                                        <button className="icon-btn" title="Cancelar" onClick={() => setEditingParamId(null)}>✕</button>
                                                    </>
                                                ) : (
                                                    <button className="icon-btn" title="Editar" onClick={() => startEditParam(param)}>✏️</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="table-footer-note">
                                ⓘ Los cambios de parámetros quedan registrados en Trazabilidad.
                            </div>
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

export default SuperUserDashboard;