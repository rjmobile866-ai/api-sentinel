import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Dashboard from './Dashboard';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Dashboard />;
};

export default Index;
