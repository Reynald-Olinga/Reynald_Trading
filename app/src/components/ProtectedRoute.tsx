// client/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import tokens from '../services/tokens.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = tokens.getToken();
  
  if (!token) {
    // Redirige vers la page de connexion
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;













// import { Navigate } from 'react-router-dom';

// export default function ProtectedRoute({ children }) {
//   const token = localStorage.getItem('token');
  
//   if (!token) {
//     return <Navigate to="/login" replace />;
//   }

//   return children;
// }