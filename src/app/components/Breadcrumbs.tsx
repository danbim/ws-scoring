import { useLocation, useNavigate } from "@solidjs/router";
import { createMemo } from "solid-js";

const Breadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumbs = createMemo(() => {
    const path = location.pathname;
    const segments = path.split("/").filter(Boolean);
    const crumbs: Array<{ label: string; path: string }> = [];

    if (segments.length === 0) {
      return [{ label: "Seasons", path: "/" }];
    }

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      let label = segment;

      // Replace IDs with readable labels
      if (segment === "seasons") {
        label = "Seasons";
      } else if (segment === "contests") {
        label = "Contests";
      } else if (segment === "divisions") {
        label = "Divisions";
      } else if (segment === "brackets") {
        label = "Brackets";
      } else if (segment === "heats") {
        label = "Heats";
      } else if (segment === "admin") {
        label = "Admin";
      } else if (segment === "riders") {
        label = "Riders";
      } else if (segment === "participants") {
        label = "Participants";
      } else if (segment === "login") {
        label = "Login";
      }

      crumbs.push({ label, path: currentPath });
    });

    return crumbs;
  });

  return (
    <nav class="flex items-center space-x-2 ml-8" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-2">
        {breadcrumbs().map((crumb, index) => (
          <li class="flex items-center">
            {index > 0 && <span class="text-gray-400 mx-2">/</span>}
            {index === breadcrumbs().length - 1 ? (
              <span class="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <button
                onClick={() => navigate(crumb.path)}
                class="text-gray-500 hover:text-gray-700"
              >
                {crumb.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
