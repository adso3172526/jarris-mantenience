import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { message } from 'antd';

interface User {
  userId: string;
  email: string;
  roles: string[];
  locationId?: string;
  permissions: string[];
  profileId?: string;
  profileName?: string;
  profileLocationIds: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => void;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (perm: string | string[]) => boolean;
  hasAccess: (roles: string[], permissions?: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      if (isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (!token || isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        message.warning('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const { access_token } = response.data;

      const payload = JSON.parse(atob(access_token.split('.')[1]));

      const userData: User = {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
        locationId: payload.locationId,
        permissions: payload.permissions || [],
        profileId: payload.profileId || undefined,
        profileName: payload.profileName || undefined,
        profileLocationIds: payload.profileLocationIds || [],
      };

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      message.success('¡Bienvenido!');

      // Redirect: ADMIN or profile with VER_DASHBOARD
      if (
        userData.roles.includes('ADMIN') ||
        userData.permissions.includes('VER_DASHBOARD')
      ) {
        return '/dashboard';
      } else {
        return '/solicitudes';
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al iniciar sesión');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    message.info('Sesión cerrada');
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    // ADMIN is a superuser
    if (user.roles.includes('ADMIN')) return true;
    // For non-ADMIN, hasRole only matches ADMIN explicitly
    if (Array.isArray(role)) {
      return role.some(r => user.roles.includes(r));
    }
    return user.roles.includes(role);
  };

  const hasPermission = (perm: string | string[]): boolean => {
    if (!user) return false;
    // ADMIN has all permissions
    if (user.roles.includes('ADMIN')) return true;
    if (Array.isArray(perm)) {
      return perm.some(p => user.permissions.includes(p));
    }
    return user.permissions.includes(perm);
  };

  const hasAccess = (_roles: string[], permissions?: string[]): boolean => {
    if (!user) return false;
    // ADMIN = superuser, full access
    if (user.roles.includes('ADMIN')) return true;
    // For non-ADMIN: only check permissions (ignore roles param)
    if (permissions && permissions.length > 0 && user.permissions.length > 0) {
      return permissions.every(p => user.permissions.includes(p));
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, hasPermission, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
