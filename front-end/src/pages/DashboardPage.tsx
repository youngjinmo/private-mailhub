import { useState, useEffect } from 'react';
import RelayEmailDashboard from '@/components/RelayEmailDashboard';
import Unauthorized from './Unauthorized';
import { checkAuth, getUsernameFromToken } from '@/lib/api';

const DashboardPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      const isAuth = checkAuth();
      if (isAuth) {
        const username = await getUsernameFromToken();
        if (username) {
          setUserEmail(username);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    initAuth();
  }, []);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Not authenticated - show 401 page
  if (!isAuthenticated) {
    return <Unauthorized />;
  }

  // Authenticated - show dashboard
  return <RelayEmailDashboard userEmail={userEmail} />;
};

export default DashboardPage;
