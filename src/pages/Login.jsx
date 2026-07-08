import React, { useState } from 'react';
import '../Styles/Login.css';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import Swal from 'sweetalert2';

const LoginIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
);

const ProfileCard = ({ profile }) => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Swal.fire('Faltan datos', 'Ingresa usuario y contraseña.', 'warning');
            return;
        }
        setLoading(true);
        try {
            const claims = await login(username, password);
            const rol = claims?.rol?.toUpperCase();

            if (rol === 'DIRECTOR') navigate('/director-dashboard');
            else if (rol === 'SECRETARIA') navigate('/secretaria-dashboard');
            else navigate('/dashboard'); // SUPERUSUARIO
        } catch (error) {
            const msg = (error.response?.status === 401 || error.response?.status === 403)
                ? 'Usuario o contraseña incorrectos.'
                : 'No se pudo conectar con el servidor.';
            Swal.fire('Error', msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-card">
            <div className={`card-header ${profile.theme.headerClass}`}>Sistema de Matrículas</div>
            <div className="card-body">
                <div className={`avatar ${profile.theme.badgeClass}`}>{profile.initials}</div>
                <h3 className="role-name">{profile.role}</h3>
                <span className={`access-badge ${profile.theme.badgeClass}`}>{profile.access}</span>

                <div className="form-group">
                    <label className="form-label">Usuario</label>
                    <input type="text" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>

                <div className="form-group">
                    <label className="form-label">Contraseña</label>
                    <input
                        type="password"
                        className="form-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                </div>

                <div className="button-group">
                    <button type="button" className={`btn ${profile.theme.btnClass}`} onClick={handleLogin} disabled={loading}>
                        <LoginIcon /> {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const LoginSelection = () => {
    const profilesData = [
        { id: 1, initials: 'SU', role: 'Superusuario', access: 'acceso total', theme: { headerClass: 'su-header', badgeClass: 'su-badge', btnClass: 'su-btn' } },
        { id: 2, initials: 'DI', role: 'Director', access: 'solo lectura', theme: { headerClass: 'di-header', badgeClass: 'di-badge', btnClass: 'di-btn' } },
        { id: 3, initials: 'SE', role: 'Secretaria', access: 'operaciones', theme: { headerClass: 'se-header', badgeClass: 'se-badge', btnClass: 'se-btn' } }
    ];

    return (
        <div className="login-wrapper">
            <div className="login-title">Login — Selección de perfil</div>
            <div className="cards-container">
                {profilesData.map((profile) => (
                    <ProfileCard key={profile.id} profile={profile} />
                ))}
            </div>
        </div>
    );
};

export default LoginSelection;