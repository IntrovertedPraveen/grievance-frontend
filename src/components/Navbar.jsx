import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { ROLE_LABEL } from '../constants.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand">ResolveTN</NavLink>
        <nav className="nav-links">
          <NavLink to="/" end>File a complaint</NavLink>
          <NavLink to="/track">Track status</NavLink>
          {user && <NavLink to="/dashboard">Dashboard</NavLink>}
          {user?.role === 'ADMIN' && <NavLink to="/admin">Manage</NavLink>}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              <span className="who">{user.name} <em>{ROLE_LABEL[user.role]}</em></span>
              <button className="btn ghost" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <NavLink to="/login" className="btn">Officials log in</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
