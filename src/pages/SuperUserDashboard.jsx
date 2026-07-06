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

    // Carga inicial de Usuarios y Funcionalidades
    useEffect(() => {
        const initData = async () => {
            try {
                const token = localStorage.getItem('token');
                
                // Pedimos usuarios y funcionalidades al mismo tiempo
                const [resUsers, resFuncs] = await Promise.all([
                    fetch('http://localhost:8081/api/usuarios', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('http://localhost:8081/api/funcionalidades', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (!resUsers.ok || !resFuncs.ok) throw new Error('Error de conexión. Verifica tu sesión.');

                setUsuarios(await resUsers.json());
                setAllFuncs(await resFuncs.json());
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        initData();
    }, []);

    // Función para cargar los permisos específicos de un rol
    const loadPermissions = useCallback(async (user) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8081/api/permisos/rol/${user.rol.idRol}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const permsData = await res.json();

            // Transformamos el array del backend a un objeto rápido de leer para el frontend
            const permMap = {};
            permsData.forEach(p => {
                permMap[p.funcionalidad.idFuncionalidad] = { 
                    ver: p.ver, crear: p.crear, editar: p.editar, eliminar: p.eliminar, imprimir: p.imprimir 
                };
            });
            setPermissions(permMap);
        } catch (error) {
            console.error("Error al cargar permisos:", error);
        }
    }, []);

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
    const applyPermissions = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Armamos el payload exacto que pide tu AplicarPermisosRequest en Spring Boot
            const payload = {
                idRol: selectedUser.rol.idRol,
                permisos: Object.keys(permissions).map(id => ({
                    idFuncionalidad: parseInt(id),
                    ...permissions[id]
                }))
            };

            const res = await fetch('http://localhost:8081/api/permisos/aplicar', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Permisos guardados con éxito.");
            } else {
                alert("Hubo un error al guardar los permisos.");
            }
        } catch (error) {
            console.error("Error guardando:", error);
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
                        <button className="sidebar-item active">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            Usuarios
                        </button>
                        <button className="sidebar-item">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                            Permisos
                        </button>
                    </aside>

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

                                    {/* Componente del Árbol de Permisos */}
                                    <PermissionTree 
                                        functionalities={allFuncs} 
                                        permissions={permissions} 
                                        onToggle={handleToggle} 
                                    />

                                    {/* Botón que llama a la función applyPermissions */}
                                    <button className="apply-btn" onClick={applyPermissions}>
                                        ✓ Aplicar permisos
                                    </button>
                                </div>
                            </>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default SuperUserDashboard;