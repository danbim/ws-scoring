import {
  type Component,
  createContext,
  createSignal,
  type JSX,
  onMount,
  useContext,
} from "solid-js";
import type { UserRole } from "../../domain/user/types.js";
import { client } from "../utils/orpc";

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
      const data = await client.auth.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      await client.auth.login({ username, password });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
    await fetchUser();
  };

  const logout = async () => {
    try {
      await client.auth.logout();
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
