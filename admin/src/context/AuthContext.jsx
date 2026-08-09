import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('admin_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token / fetch current user info
      fetchUserProfile();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const payload = parseJwt(token);
      if (payload) {
        // Expiration check: if token has expired, log out immediately
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn("Session token expired. Logging out.");
          logout();
          return;
        }
        const savedOverride = localStorage.getItem('active_role_override');
        setUser({
          email: payload.sub,
          role: savedOverride || payload.role || 'SUPER_ADMIN',
          id: payload.userId,
          permissions: payload.permissions || []
        });
      }
    } catch (error) {
      console.error("Failed to parse token", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const parseJwt = (t) => {
    try {
      const base64Url = t.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const login = async (email, password) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 4000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await api.post('/auth/login', { email, password });
        const { accessToken, token, user: userData } = response.data; 
        
        const realToken = accessToken || token || response.data; 
        
        if (typeof realToken === 'string') {
          localStorage.setItem('admin_token', realToken);
          localStorage.setItem('token', realToken);
          setToken(realToken);
          
          const payload = parseJwt(realToken);
          setUser({
            email: userData?.email || email,
            role: userData?.role || payload?.role || 'SUPER_ADMIN',
            id: userData?.id || payload?.userId || 1,
            permissions: payload ? (payload.permissions || []) : []
          });
          const userRole = userData?.role || payload?.role || 'SUPER_ADMIN';
          return { success: true, role: userRole };
        } else {
          throw new Error("Invalid token format");
        }
      } catch (error) {
        if (!error.response) {
          // Network error — backend may be cold-starting on Render
          if (attempt < MAX_RETRIES) {
            // Wake up the backend with a lightweight ping
            try { await fetch(api.defaults.baseURL.replace('/api/v1', '') + '/actuator/health', { mode: 'no-cors' }).catch(() => {}); } catch {}
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
            continue;
          }
          return {
            success: false,
            message: 'Unable to connect to backend server. The server may be starting up — please wait 30 seconds and try again.'
          };
        }
        if (error.response.status >= 500) {
          return {
            success: false,
            message: `Backend server error (${error.response.status}). Please check backend deployment.`
          };
        }
        return {
          success: false,
          message: error.response?.data?.message || 'Login failed. Please check credentials.'
        };
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('active_role_override');
    setToken(null);
    setUser(null);
  };

  const switchRole = (newRole) => {
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      localStorage.setItem('active_role_override', newRole);
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.permissions ? user.permissions.includes(permission) : true;
  };

  const hasAnyRole = (roles) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!roles) return true;
    return Array.isArray(roles) ? roles.includes(user.role) : roles === user.role;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasPermission, hasAnyRole, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
