import { useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js";
import type { Bracket, Contest, Division, Season } from "../types";
import { apiGet } from "../utils/api";

interface BreadcrumbItem {
  label: string;
  path: string;
}

const Breadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [seasonName, setSeasonName] = createSignal<string | null>(null);
  const [contestName, setContestName] = createSignal<string | null>(null);
  const [divisionName, setDivisionName] = createSignal<string | null>(null);
  const [bracketName, setBracketName] = createSignal<string | null>(null);

  const pathSegments = createMemo(() => {
    const path = location.pathname;
    return path.split("/").filter(Boolean);
  });

  const loadEntityNames = async () => {
    const segments = pathSegments();
    setSeasonName(null);
    setContestName(null);
    setDivisionName(null);
    setBracketName(null);

    try {
      // Find season ID
      const seasonIdx = segments.indexOf("seasons");
      if (seasonIdx >= 0 && seasonIdx + 1 < segments.length) {
        const seasonId = segments[seasonIdx + 1];
        const seasonData = await apiGet<Season>(`/api/seasons/${seasonId}`);
        setSeasonName(seasonData.name);
      }

      // Find contest ID
      const contestIdx = segments.indexOf("contests");
      if (contestIdx >= 0 && contestIdx + 1 < segments.length) {
        const contestId = segments[contestIdx + 1];
        const contestData = await apiGet<Contest>(`/api/contests/${contestId}`);
        setContestName(contestData.name);
      }

      // Find division ID
      const divisionIdx = segments.indexOf("divisions");
      if (divisionIdx >= 0 && divisionIdx + 1 < segments.length) {
        const divisionId = segments[divisionIdx + 1];
        const divisionData = await apiGet<Division>(`/api/divisions/${divisionId}`);
        setDivisionName(divisionData.name);
      }

      // Find bracket ID
      const bracketIdx = segments.indexOf("brackets");
      if (bracketIdx >= 0 && bracketIdx + 1 < segments.length) {
        const bracketId = segments[bracketIdx + 1];
        const bracketData = await apiGet<Bracket>(`/api/brackets/${bracketId}`);
        setBracketName(bracketData.name);
      }
    } catch (error) {
      console.error("Error loading entity names for breadcrumbs:", error);
    }
  };

  onMount(() => {
    loadEntityNames();
  });

  createEffect(() => {
    // Reload when path changes
    pathSegments();
    loadEntityNames();
  });

  const breadcrumbs = createMemo(() => {
    const segments = pathSegments();
    const crumbs: BreadcrumbItem[] = [];

    // Always start with Home/Seasons
    crumbs.push({ label: "Seasons", path: "/" });

    if (segments.length === 0) {
      return crumbs;
    }

    let currentPath = "";
    let i = 0;

    while (i < segments.length) {
      const segment = segments[i];
      currentPath += `/${segment}`;

      if (segment === "seasons" && i + 1 < segments.length) {
        const seasonId = segments[i + 1];
        i += 2;
        // Season breadcrumb points to contests list
        const seasonPath = `/seasons/${seasonId}/contests`;
        crumbs.push({
          label: seasonName() || `Season ${seasonId.substring(0, 8)}...`,
          path: seasonPath,
        });
        if (i < segments.length && segments[i] === "contests") {
          i++; // Skip "contests"
          currentPath += "/contests";
          if (i < segments.length) {
            const contestId = segments[i];
            i++;
            // Contest breadcrumb points to divisions list
            const contestPath = `/seasons/${seasonId}/contests/${contestId}/divisions`;
            crumbs.push({
              label: contestName() || `Contest ${contestId.substring(0, 8)}...`,
              path: contestPath,
            });
            if (i < segments.length && segments[i] === "divisions") {
              i++; // Skip "divisions"
              currentPath += "/divisions";
              if (i < segments.length) {
                const divisionId = segments[i];
                i++;
                // Division breadcrumb points to divisions list (which shows all divisions as tabs)
                const divisionPath = `/seasons/${seasonId}/contests/${contestId}/divisions`;
                crumbs.push({
                  label: divisionName() || `Division ${divisionId.substring(0, 8)}...`,
                  path: divisionPath,
                });
                currentPath += `/${divisionId}`;
                if (i < segments.length && segments[i] === "brackets") {
                  i++; // Skip "brackets"
                  currentPath += "/brackets";
                  if (i < segments.length) {
                    const bracketId = segments[i];
                    i++;
                    // Bracket breadcrumb points to heats list
                    const bracketPath = `/seasons/${seasonId}/contests/${contestId}/divisions/${divisionId}/brackets/${bracketId}/heats`;
                    crumbs.push({
                      label: bracketName() || `Bracket ${bracketId.substring(0, 8)}...`,
                      path: bracketPath,
                    });
                    if (i < segments.length && segments[i] === "heats") {
                      i++; // Skip "heats"
                      currentPath += "/heats";
                      if (i < segments.length) {
                        const heatId = segments[i];
                        i++;
                        currentPath += `/${heatId}`;
                        crumbs.push({
                          label: `Heat ${heatId}`,
                          path: currentPath,
                        });
                      } else {
                        crumbs.push({
                          label: "Heats",
                          path: currentPath,
                        });
                      }
                    }
                  }
                } else if (i < segments.length && segments[i] === "participants") {
                  i++;
                  currentPath += "/participants";
                  crumbs.push({
                    label: "Participants",
                    path: currentPath,
                  });
                }
              }
            }
          }
        }
      } else if (segment === "admin") {
        i++;
        if (i < segments.length && segments[i] === "riders") {
          i++;
          currentPath += "/riders";
          crumbs.push({ label: "Riders", path: currentPath });
        } else {
          crumbs.push({ label: "Admin", path: currentPath });
        }
      } else {
        i++;
      }
    }

    return crumbs;
  });

  const visibleCrumbs = createMemo(() => {
    const all = breadcrumbs();
    // On mobile, show only last 2 items, on tablet show last 3, on desktop show all
    if (all.length <= 2) return all;
    // Show ellipsis + last 2 on mobile, last 3 on tablet
    return all.slice(-2);
  });

  const hiddenCrumbs = createMemo(() => {
    const all = breadcrumbs();
    const visible = visibleCrumbs();
    if (all.length <= visible.length) return [];
    return all.slice(0, all.length - visible.length);
  });

  return (
    <nav class="flex items-center min-w-0 ml-2 sm:ml-4 lg:ml-8" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-1 sm:space-x-2 min-w-0 overflow-hidden">
        <Show when={hiddenCrumbs().length > 0}>
          <li class="flex items-center flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate(hiddenCrumbs()[0]?.path || "/")}
              class="text-xs sm:text-sm text-gray-500 hover:text-gray-700 truncate"
            >
              ...
            </button>
            <span class="text-gray-400 mx-1 sm:mx-2">/</span>
          </li>
        </Show>
        <For each={visibleCrumbs()}>
          {(crumb, index) => (
            <li class="flex items-center flex-shrink-0">
              {index() > 0 && <span class="text-gray-400 mx-1 sm:mx-2">/</span>}
              {index() === visibleCrumbs().length - 1 ? (
                <span class="text-xs sm:text-sm text-gray-900 font-medium truncate max-w-[120px] sm:max-w-none">
                  {crumb.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(crumb.path)}
                  class="text-xs sm:text-sm text-gray-500 hover:text-gray-700 truncate max-w-[100px] sm:max-w-none"
                >
                  {crumb.label}
                </button>
              )}
            </li>
          )}
        </For>
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
