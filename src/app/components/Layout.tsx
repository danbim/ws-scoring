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
          <div class="mx-auto px-2 sm:px-4 lg:px-8">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:h-16 py-2 sm:py-0">
              <div class="flex items-center mb-2 sm:mb-0 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  class="text-lg sm:text-xl font-bold text-indigo-600 hover:text-indigo-800 flex-shrink-0"
                >
                  WS Scoring
                </button>
                <Breadcrumbs />
              </div>
              <div class="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                {auth.user() && (
                  <>
                    <span class="text-xs sm:text-sm text-gray-700 hidden sm:inline">
                      {auth.user()?.username} ({auth.user()?.role})
                    </span>
                    <span class="text-xs text-gray-700 sm:hidden">{auth.user()?.username}</span>
                    {auth.isHeadJudgeOrAdmin() && (
                      <button
                        type="button"
                        onClick={() => navigate("/admin/riders")}
                        class="text-xs sm:text-sm px-2 py-1 sm:px-0 sm:py-0 text-indigo-600 hover:text-indigo-800"
                      >
                        Riders
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      class="text-xs sm:text-sm px-2 py-1 sm:px-0 sm:py-0 text-gray-600 hover:text-gray-800"
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
      <main class={isLoginPage() ? "" : "mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8"}>
        {props.children}
      </main>
    </div>
  );
};

export default Layout;
