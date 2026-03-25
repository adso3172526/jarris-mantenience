import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { message } from 'antd';

interface User {
  userId: string;
  email: string;
  roles: string[];
  locationId?: string; // ✅ AGREGADO
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string>; // ⭐ Retorna ruta
  logout: () => void;
  hasRole: (role: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Verificar si el JWT ha expirado
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp está en segundos, Date.now() en milisegundos
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión guardada
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

  // Verificar periódicamente si el token sigue vigente (cada 60s)
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
      
      // ✅ AGREGADO: Extraer locationId del JWT
      const userData: User = {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
        locationId: payload.locationId, // ✅ AGREGADO
      };

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      message.success('¡Bienvenido!');

      // ⭐ NUEVO: Determinar ruta de redirección según rol
      if (userData.roles.includes('ADMIN') || userData.roles.includes('JEFE_MANTENIMIENTO')) {
        return '/dashboard';
      } else {
        // TECNICO_INTERNO, CONTRATISTA, PDV, ADMINISTRACION
        return '/work-orders';
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
    
    if (Array.isArray(role)) {
      return role.some(r => user.roles.includes(r));
    }
    
    return user.roles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
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
