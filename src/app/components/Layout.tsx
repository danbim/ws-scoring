import { useLocation, useNavigate } from "@solidjs/router";
import type { Component, JSX } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import Breadcrumbs from "./Breadcrumbs";

interface LayoutProps {
  children: JSX.Element;
}

const Layout: Component<LayoutProps> = (props) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await auth.logout();
    navigate("/login");
  };

  const isLoginPage = () => location.pathname === "/login";

  return (
    <div class="min-h-screen bg-gray-50">
      {!isLoginPage() && (
        <nav class="bg-white shadow-sm">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <button
                  onClick={() => navigate("/")}
                  class="text-xl font-bold text-indigo-600 hover:text-indigo-800"
                >
                  WS Scoring
                </button>
                <Breadcrumbs />
              </div>
              <div class="flex items-center space-x-4">
                {auth.user() && (
                  <>
                    <span class="text-sm text-gray-700">
                      {auth.user()?.username} ({auth.user()?.role})
                    </span>
                    {auth.isHeadJudgeOrAdmin() && (
                      <button
                        onClick={() => navigate("/admin/riders")}
                        class="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Manage Riders
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      class="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}
      <main class={isLoginPage() ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"}>
        {props.children}
      </main>
    </div>
  );
};

export default Layout;
