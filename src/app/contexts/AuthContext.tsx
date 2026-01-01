import {
  type Component,
  createContext,
  createSignal,
  type JSX,
  onMount,
  useContext,
} from "solid-js";
import type { UserRole } from "../../domain/user/types.js";

export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
}

interface AuthContextType {
  user: () => PublicUser | null;
  loading: () => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isHeadJudgeOrAdmin: () => boolean;
  isJudge: () => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: Component<{ children: JSX.Element }> = (props) => {
  const [user, setUser] = createSignal<PublicUser | null>(null);
  const [loading, setLoading] = createSignal(true);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Login failed");
    }

    await fetchUser();
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setUser(null);
    }
  };

  const isHeadJudgeOrAdmin = () => {
    const currentUser = user();
    return currentUser?.role === "head_judge" || currentUser?.role === "administrator";
  };

  const isJudge = () => {
    const currentUser = user();
    return currentUser?.role === "judge";
  };

  onMount(() => {
    fetchUser();
  });

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isHeadJudgeOrAdmin,
    isJudge,
    refreshUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
};
