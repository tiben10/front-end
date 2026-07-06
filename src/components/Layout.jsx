import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path ? 'bg-primary text-white' : 'text-white';

    return (
        <div className="d-flex vh-100 bg-light">
            <div className="bg-dark p-3 d-flex flex-column shadow" style={{ width: '280px' }}>
                <h4 className="text-center mb-4 text-white fw-bold mt-3">
                    <span className="text-primary">Sys</span>Matrícula 🎓
                </h4>
                <hr className="text-secondary" />
                
                <ul className="nav nav-pills flex-column mb-auto gap-2">
                    <li className="nav-item">
                        <Link to="/dashboard" className={`nav-link fw-semibold ${isActive('/dashboard')}`}>
                            📊 Estado de Cuotas
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/dashboard/alumnos" className={`nav-link fw-semibold ${isActive('/dashboard/alumnos')}`}>
                            👨‍🎓 Gestión de Alumnos
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/dashboard/matriculas" className={`nav-link fw-semibold ${isActive('/dashboard/matriculas')}`}>
                            📝 Registro Matrículas
                        </Link>
                    </li>
                </ul>
                
                <hr className="text-secondary" />
                <button className="btn btn-outline-danger w-100 mt-auto fw-bold" onClick={handleLogout}>
                    Cerrar Sesión
                </button>
            </div>

            <div className="flex-grow-1 p-5 overflow-auto">
                <div className="bg-white p-4 rounded shadow-sm h-100">
                    {/* Aquí se inyectan las pantallas dinámicamente */}
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;