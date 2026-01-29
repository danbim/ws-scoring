import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import { createMemo, For } from "solid-js";
import { orpc } from "../utils/orpc";

interface BreadcrumbItem {
  label: string;
  path: string;
}

const Breadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{
    seasonId?: string;
    contestId?: string;
    divisionId?: string;
    bracketId?: string;
    heatId?: string;
  }>();

  const seasonQuery = useQuery(() => ({
    ...orpc.season.get.queryOptions({ input: { seasonId: params.seasonId ?? "" } }),
    enabled: !!params.seasonId,
  }));

  const contestQuery = useQuery(() => ({
    ...orpc.contest.get.queryOptions({ input: { contestId: params.contestId ?? "" } }),
    enabled: !!params.contestId,
  }));

  const divisionQuery = useQuery(() => ({
    ...orpc.division.get.queryOptions({ input: { divisionId: params.divisionId ?? "" } }),
    enabled: !!params.divisionId,
  }));

  const bracketQuery = useQuery(() => ({
    ...orpc.bracket.get.queryOptions({ input: { bracketId: params.bracketId ?? "" } }),
    enabled: !!params.bracketId,
  }));

  const heatQuery = useQuery(() => ({
    ...orpc.heat.get.queryOptions({ input: { heatId: params.heatId ?? "" } }),
    enabled: !!params.heatId,
  }));

  const breadcrumbs = createMemo(() => {
    const crumbs: BreadcrumbItem[] = [{ label: "Seasons", path: "/" }];

    if (!params.seasonId) return crumbs;
    crumbs.push({
      label: seasonQuery.data?.name ?? `Season ${params.seasonId.substring(0, 8)}…`,
      path: `/seasons/${params.seasonId}/contests`,
    });

    if (!params.contestId) return crumbs;
    crumbs.push({
      label: contestQuery.data?.name ?? `Contest ${params.contestId.substring(0, 8)}…`,
      path: `/seasons/${params.seasonId}/contests/${params.contestId}/divisions`,
    });

    if (!params.divisionId) return crumbs;
    const divisionsPath = `/seasons/${params.seasonId}/contests/${params.contestId}/divisions`;
    crumbs.push({
      label: divisionQuery.data?.name ?? `Division ${params.divisionId.substring(0, 8)}…`,
      path: divisionsPath,
    });

    if (location.pathname.includes("/participants")) {
      crumbs.push({ label: "Participants", path: location.pathname });
      return crumbs;
    }

    if (!params.bracketId) return crumbs;
    crumbs.push({
      label: bracketQuery.data?.name ?? `Bracket ${params.bracketId.substring(0, 8)}…`,
      path: divisionsPath,
    });

    if (!params.heatId) return crumbs;
    crumbs.push({
      label: heatQuery.data?.position
        ? `Heat ${heatQuery.data.position}`
        : `Heat ${params.heatId.substring(0, 8)}…`,
      path: location.pathname,
    });

    return crumbs;
  });

  return (
    <nav class="flex items-center min-w-0 ml-2 sm:ml-4 lg:ml-8" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-1 sm:space-x-2 min-w-0 overflow-hidden">
        <For each={breadcrumbs()}>
          {(crumb, index) => (
            <li class="flex items-center flex-shrink-0">
              {index() > 0 && <span class="text-gray-400 mx-1 sm:mx-2">/</span>}
              {index() === breadcrumbs().length - 1 ? (
                <span class="text-xs sm:text-sm text-gray-900 font-medium truncate">
                  {crumb.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(crumb.path)}
                  class="text-xs sm:text-sm text-gray-500 hover:text-gray-700 truncate"
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
