import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fastLoginAs: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo credentials for quick 1-click role testing
export const DEMO_ACCOUNTS: { role: Role; label: string; email: string; pass: string; description: string }[] = [
  {
    role: 'ADMIN',
    label: 'Admin',
    email: 'admin@ledmfg.com',
    pass: 'admin123',
    description: 'Full system access & administrative controls',
  },
  {
    role: 'STORE_KEEPER',
    label: 'Store Keeper',
    email: 'store@ledmfg.com',
    pass: 'store123',
    description: 'Raw materials, stock inward, adjustment & inventory',
  },
  {
    role: 'PRODUCTION_SUPERVISOR',
    label: 'Production Supervisor',
    email: 'supervisor@ledmfg.com',
    pass: 'super123',
    description: 'BOM calculations, production orders & assembly tracking',
  },
  {
    role: 'QC_ENGINEER',
    label: 'QC Engineer',
    email: 'qc@ledmfg.com',
    pass: 'qc123',
    description: 'Testing parameters, burn-in verification & certificates',
  },
  {
    role: 'DISPATCH_TEAM',
    label: 'Dispatch Team',
    email: 'dispatch@ledmfg.com',
    pass: 'dispatch123',
    description: 'Finished goods inventory, customer dispatch & delivery notes',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('led_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('led_auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('led_auth_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.data);
          localStorage.setItem('led_auth_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Session validation failed:', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('led_auth_token', newToken);
      localStorage.setItem('led_auth_user', JSON.stringify(newUser));
    } finally {
      setIsLoading(false);
    }
  };

  const fastLoginAs = async (role: Role) => {
    const acc = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (acc) {
      await login(acc.email, acc.pass);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('led_auth_token');
    localStorage.removeItem('led_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, fastLoginAs }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
