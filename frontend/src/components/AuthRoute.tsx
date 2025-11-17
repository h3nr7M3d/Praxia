import { Navigate, Outlet } from 'react-router-dom';

const AuthRoute = () => {
  // Considerar sesión válida si existe token O userId (login actual guarda userId)
  const isAuthenticated = !!(localStorage.getItem('token') || localStorage.getItem('userId'));
  
  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado, renderizar el componente hijo
  return <Outlet />;
};

export default AuthRoute;
