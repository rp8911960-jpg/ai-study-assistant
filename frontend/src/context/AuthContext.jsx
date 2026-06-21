import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ email: 'guest@example.com', name: 'Guest' });
  const [loading, setLoading] = useState(false);

  const login = async () => {};
  const signup = async () => {};
  const logout = () => {};

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
