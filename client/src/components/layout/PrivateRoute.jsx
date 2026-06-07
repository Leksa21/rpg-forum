import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-rune">⚔️</div>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  return children;
}
