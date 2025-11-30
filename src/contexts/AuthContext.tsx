import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthUser } from "@/types/user";
import { setAuthToken, clearAuthToken, login as loginRequest, getCurrentUser } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setState({ user: null, isLoading: false });
      return;
    }

    setAuthToken(token);

    getCurrentUser()
      .then((user) => {
        setState({ user, isLoading: false });
      })
      .catch(() => {
        clearAuthToken();
        setState({ user: null, isLoading: false });
        localStorage.removeItem("token");
      });
  }, []);

  const login = async (username: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { access_token: token } = await loginRequest({ username, password });
      localStorage.setItem("token", token);
      setAuthToken(token);

      const user = await getCurrentUser();
      setState({ user, isLoading: false });
      navigate("/");
    } catch (error) {
      clearAuthToken();
      localStorage.removeItem("token");
      setState({ user: null, isLoading: false });
      throw error;
    }
  };

  const logout = () => {
    clearAuthToken();
    localStorage.removeItem("token");
    setState({ user: null, isLoading: false });
    navigate("/login");
  };

  const setUser = (user: AuthUser | null) => {
    setState({ user, isLoading: false });
  };

  const refreshUser = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const user = await getCurrentUser();
      setState({ user, isLoading: false });
    } catch (error) {
      clearAuthToken();
      localStorage.removeItem("token");
      setState({ user: null, isLoading: false });
      throw error;
    }
  };

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    setUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
