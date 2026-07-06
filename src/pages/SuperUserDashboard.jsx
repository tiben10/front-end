import React, { useState, useEffect, useCallback } from 'react';
import '../Styles/Dashboard.css'
import PermissionTree from './PermissionTree'; // <-- Importamos el componente del árbol

const SuperUserDashboard = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [allFuncs, setAllFuncs] = useState([]); // <-- Nuevo estado para las funcionalidades
    const [permissions, setPermissions] = useState({}); // <-- Nuevo estado para los checkboxes
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeTab, setActiveTab] = useState('usuarios');

    // Carga inicial de Usuarios y Funcionalidades
    useEffect(() => {
        const mockUsuarios = [
            { idUsuario: 1, usuario: 'admin', estado: true, rol: { idRol: 1, nombreRol: 'SUPERUSUARIO' } },
            { idUsuario: 2, usuario: 'director1', estado: true, rol: { idRol: 2, nombreRol: 'DIRECTOR' } },
            { idUsuario: 3, usuario: 'secretaria1', estado: true, rol: { idRol: 3, nombreRol: 'SECRETARIA' } },
            { idUsuario: 4, usuario: 'secretaria2', estado: false, rol: { idRol: 3, nombreRol: 'SECRETARIA' } }
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

    // Función para cargar los permisos específicos de un rol
    const loadPermissions = useCallback((user) => {
        const permMap = {};
        allFuncs.forEach(func => {
            permMap[func.idFuncionalidad] = {
                ver: user.rol.idRol === 1,
                crear: false,
                editar: false,
                eliminar: false,
                imprimir: false
            };
        });
        setPermissions(permMap);
    }, [allFuncs]);

    // Efecto que dispara la carga de permisos cuando seleccionas un usuario en la tabla
    useEffect(() => {
        if (selectedUser) {
            loadPermissions(selectedUser);
        }
    }, [selectedUser, loadPermissions]);

    // Función que se ejecuta cada vez que haces clic en un checkbox
    const handleToggle = (funcId, action) => {
        setPermissions(prev => {
            const currentFuncPerms = prev[funcId] || { ver: false, crear: false, editar: false, eliminar: false, imprimir: false };
            return {
                ...prev,
                [funcId]: {
                    ...currentFuncPerms,
                    [action]: !currentFuncPerms[action]
                }
            };
        });
    };

    // Función para enviar los cambios a la base de datos
    const applyPermissions = () => {
        alert("Permisos guardados con éxito.");
    };

    const getRoleBadgeClass = (nombreRol) => {
        switch (nombreRol?.toUpperCase()) {
            case 'SUPERUSUARIO': return 'role-su';
            case 'DIRECTOR': return 'role-di';
            case 'SECRETARIA': return 'role-se';
            default: return 'role-se';
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
                            <main className="dash-content">
                                <h3 className="section-title">Listado de usuarios</h3>

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
                                                        <td className="doc-text">—</td>
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
                                                            {isSuperUser ? "bloqueado" : isDeleted ? "lógico" : <button className="icon-btn" title="Eliminar lógicamente">⊘</button>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}

                                <div className="table-footer-note">
                                    ⓘ La eliminación es lógica (trazabilidad)
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

                                            <PermissionTree
                                                functionalities={allFuncs}
                                                permissions={permissions}
                                                onToggle={handleToggle}
                                            />

                                            <button className="apply-btn" onClick={applyPermissions}>
                                                ✓ Aplicar cambios
                                            </button>
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

export default SuperUserDashboard;