// File: src/context/AuthContext.tsx
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { USERS_REGISTRY, UserCredential, UserRole } from '@/data/users.data';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  businessId: string;
  asesorId: string | null;
  exp?: number;
  iat?: number;
}

interface AuthContextType {
  currentUser: UserCredential | null;
  login: (email: string, password: string) => Promise<{ success: boolean; requires2FA?: boolean; tempUser?: UserCredential; error?: string }>;
  verify2FA: (code: string, tempUser: UserCredential) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext debe utilizarse dentro de un AuthProvider');
  return context;
};

// Utilidad para decodificar el payload JWT base64 sin dependencias externas
export const decodeJWT = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decodificando JWT:', e);
    return null;
  }
};

// Transforma el payload del backend en la estructura interna UserCredential
const mapJwtToUser = (payload: JwtPayload): UserCredential => {
  const rawRole = payload.role?.toLowerCase() || '';
  let mappedRole: UserRole = 'Asesor';
  
  if (rawRole === 'admin') mappedRole = 'Admin';
  else if (rawRole === 'owner') mappedRole = 'Owner';

  // Buscar coincidencia en el registro local para mantener nombres e información extra temporalmente
  const registryUser = USERS_REGISTRY.find(u => u.email.toLowerCase() === payload.email.toLowerCase());

  return {
    id: payload.sub, // Mantener el UUID real proveniente del Token
    name: registryUser ? registryUser.name : payload.email.split('@')[0],
    email: payload.email,
    password: '', // Jamás almacenar la contraseña en estado de sesión
    role: mappedRole,
    phone: registryUser ? registryUser.phone : 'S/N',
    asesorId: payload.asesorId || null,
  };
};

// Función para simular el JWT que nos devolvería el backend
const createMockJwt = (user: UserCredential): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  
  // Mapeamos el ID de mock al formato de payload esperado
  const isManagement = user.role === 'Admin' || user.role === 'Owner';
  const payload: JwtPayload = {
    sub: user.id, // En un entorno real este sería el UUID de la base de datos (ej. 8ab62d19-...)
    email: user.email,
    role: user.role.toLowerCase(), // 'admin', 'owner', 'asesor'
    businessId: '1f91abd5-0436-467d-bb75-fb212c6e7230',
    asesorId: isManagement ? null : user.id,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // Validez de 24 horas
    iat: Math.floor(Date.now() / 1000),
  };

  // Convertimos a base64url standard
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return `${header}.${payloadB64}.mock_signature`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserCredential | null>(null);

  // Intentar cargar la sesión JWT al inicio
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded) {
        // Validar expiración si el backend envía 'exp'
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.warn('Sesión JWT expirada');
          logout();
        } else {
          setCurrentUser(mapJwtToUser(decoded));
        }
      } else {
        // Token malformado
        logout();
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
      });
      const json = await response.json().catch(() => ({}));
      const token = json.accessToken as string | undefined;
      if (!response.ok || !token) {
        return { success: false, error: json.error || 'Credenciales incorrectas' };
      }
      localStorage.setItem('accessToken', token);
      const decoded = decodeJWT(token);
      if (decoded) setCurrentUser(mapJwtToUser(decoded));
      return { success: true, requires2FA: false };
    } catch {
      return { success: false, error: 'No se pudo contactar la API de Nexova' };
    }
  };

  const verify2FA = (code: string, tempUser: UserCredential) => {
    // Validación simulada de 2FA
    if (code.length === 6 && /^\d+$/.test(code)) {
      const token = createMockJwt(tempUser);
      localStorage.setItem('accessToken', token);
      
      const decoded = decodeJWT(token);
      if (decoded) setCurrentUser(mapJwtToUser(decoded));
      
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('accessToken');
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      verify2FA,
      logout,
      isAuthenticated: !!currentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}
