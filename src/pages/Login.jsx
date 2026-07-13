import React, { useState } from 'react';
import '../Styles/Login.css';
import { useNavigate } from 'react-router-dom';
import { login, logout } from '../services/authService';
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

            // El rol real del usuario debe coincidir con el perfil (tarjeta)
            // donde se ingresó el login. Si no coincide, se rechaza el
            // acceso aunque las credenciales sean válidas.
            if (rol !== profile.expectedRol) {
                logout(); // limpia el token/rol que login() ya había guardado
                Swal.fire(
                    'Acceso no permitido',
                    `El usuario "${username}" no tiene el perfil de ${profile.role}. Ingresa por la tarjeta correspondiente a tu rol (${rol ? rol.charAt(0) + rol.slice(1).toLowerCase() : 'desconocido'}).`,
                    'error'
                );
                return;
            }

             if (rol === 'DIRECTOR') navigate('/director-dashboard');
             else if (rol === 'SECRETARIA') navigate('/secretaria-dashboard');
             else navigate('/dashboard'); // SUPERUSUARIO
         } catch (error) {
            const status = error.response?.status;
            const mensajeBackend = typeof error.response?.data === 'string'
                ? error.response.data
                : error.response?.data?.mensaje;

            if (status === 423) {
                // Usuario bloqueado temporalmente por intentos fallidos (lo maneja el backend)
                Swal.fire(
                    'Cuenta bloqueada',
                    mensajeBackend || 'Tu cuenta está bloqueada temporalmente por múltiples intentos fallidos. Intente nuevamente en 15 minuto(s)',
                    'error'
                );
            } else if (status === 401 || status === 403) {
                Swal.fire(
                    'Usuario o contraseña incorrectos',
                    mensajeBackend || 'Usuario o contraseña incorrectos.',
                    'warning'
                );
            } else {
                Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
            }
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
        //{ id: 1, initials: 'AC', role: 'LOGIN', access: 'Inicio de Sesion', theme: { headerClass: 'su-header', badgeClass: 'su-badge', btnClass: 'su-btn' } },
        { id: 1, initials: 'SU', role: 'Superusuario', expectedRol: 'SUPERUSUARIO', access: 'acceso total', theme: { headerClass: 'su-header', badgeClass: 'su-badge', btnClass: 'su-btn' } },
        { id: 2, initials: 'DI', role: 'Director', expectedRol: 'DIRECTOR', access: 'solo lectura', theme: { headerClass: 'di-header', badgeClass: 'di-badge', btnClass: 'di-btn' } },
        { id: 3, initials: 'SE', role: 'Secretaria', expectedRol: 'SECRETARIA', access: 'operaciones', theme: { headerClass: 'se-header', badgeClass: 'se-badge', btnClass: 'se-btn' } }
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