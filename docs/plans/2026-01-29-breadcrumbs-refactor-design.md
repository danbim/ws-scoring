# Breadcrumbs Component Refactor

## Problem

The `Breadcrumbs` component (`src/app/components/breadcrumbs.tsx`) has several issues:

1. **Manual async fetches bypass TanStack Query** -- Five `await client.*` calls with manual signals instead of `useQuery`/`orpc`. No caching, no deduplication, no loading states. If the page already fetched the same season, breadcrumbs fires a redundant request.

2. **Redundant double-fetch on mount** -- Both `onMount` and `createEffect` call `loadEntityNames()`, causing two identical fetches on initial render. (`createEffect` already runs on mount in SolidJS.)

3. **URL string parsing instead of route params** -- Manually splits `location.pathname` and searches for segment names, when `useParams()` already provides typed route parameters.

4. **Deeply nested imperative breadcrumb building** -- A `while` loop with ~100 lines of nested `if` blocks. Fragile and hard to follow.

5. **Broken responsive truncation** -- Comment says "mobile 2, tablet 3, desktop all" but always returns last 2. The `visibleCrumbs`/`hiddenCrumbs` logic adds complexity without working correctly.

## Design

### Data Loading

Replace the five manual signals and `loadEntityNames` async function with five independent `useQuery` calls using `orpc` query options. Use `useParams()` from `@solidjs/router` to get route parameters.

```tsx
const params = useParams<{
  seasonId?: string;
  contestId?: string;
  divisionId?: string;
  bracketId?: string;
  heatId?: string;
}>();

const seasonQuery = useQuery(() => ({
  ...orpc.season.get.queryOptions({ input: { seasonId: params.seasonId! } }),
  enabled: !!params.seasonId,
}));

const contestQuery = useQuery(() => ({
  ...orpc.contest.get.queryOptions({ input: { contestId: params.contestId! } }),
  enabled: !!params.contestId,
}));

// Same pattern for division, bracket, heat
```

Benefits:
- Cache sharing with page components (no redundant requests)
- Automatic deduplication
- Independent loading per entity
- Reactive by default (no `onMount`/`createEffect` needed)

### New `bracket.get` Endpoint

The existing `getWithHeats` fetches rounds and heats unnecessarily for breadcrumbs. Add a lightweight `bracket.get` endpoint.

**Repository** (`bracket-repository.ts`):
```ts
async getBracketById(bracketId: string): Promise<Bracket | null> {
  const result = await db.select().from(brackets).where(eq(brackets.id, bracketId));
  return result[0] ?? null;
}
```

**Route** (`src/api/orpc/routes/brackets.ts`):
```ts
get: authedProcedure
  .input(z.object({ bracketId: z.string().uuid() }))
  .output(bracketResponseSchema)
  .handler(async ({ input }) => {
    const bracket = await bracketRepository.getBracketById(input.bracketId);
    if (!bracket) throw new ORPCError("NOT_FOUND", { message: "Bracket not found" });
    return formatBracketResponse(bracket);
  }),
```

No new types or schemas needed -- `Bracket` and `bracketResponseSchema` already exist.

### Breadcrumb Building Logic

Replace the nested `while`/`if` tree with a flat sequential builder that checks params in order:

```tsx
const breadcrumbs = createMemo(() => {
  const crumbs: BreadcrumbItem[] = [{ label: "Seasons", path: "/" }];

  if (!params.seasonId) return crumbs;
  crumbs.push({
    label: seasonQuery.data?.name ?? `Season ${params.seasonId.substring(0, 8)}...`,
    path: `/seasons/${params.seasonId}/contests`,
  });

  if (!params.contestId) return crumbs;
  crumbs.push({
    label: contestQuery.data?.name ?? `Contest ${params.contestId.substring(0, 8)}...`,
    path: `/seasons/${params.seasonId}/contests/${params.contestId}/divisions`,
  });

  if (!params.divisionId) return crumbs;
  const divisionsPath = `/seasons/${params.seasonId}/contests/${params.contestId}/divisions`;
  crumbs.push({
    label: divisionQuery.data?.name ?? `Division ${params.divisionId.substring(0, 8)}...`,
    path: divisionsPath,
  });

  if (location.pathname.includes("/participants")) {
    crumbs.push({ label: "Participants", path: location.pathname });
    return crumbs;
  }

  if (!params.bracketId) return crumbs;
  crumbs.push({
    label: bracketQuery.data?.name ?? `Bracket ${params.bracketId.substring(0, 8)}...`,
    path: divisionsPath,
  });

  if (!params.heatId) return crumbs;
  crumbs.push({
    label: heatQuery.data?.position
      ? `Heat ${heatQuery.data.position}`
      : `Heat ${params.heatId.substring(0, 8)}...`,
    path: location.pathname,
  });

  return crumbs;
});
```

~30 lines replacing ~100 lines. Each early `return` makes the breadcrumb chain for each route depth explicit.

### Responsive Behavior

Drop `visibleCrumbs`, `hiddenCrumbs`, and the ellipsis button. Show all breadcrumbs and let `overflow-hidden` on the container handle truncation naturally.

### Rendering

Simplified JSX iterating directly over `breadcrumbs()`:

```tsx
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
```

## Changes Summary

| File | Change |
|------|--------|
| `src/app/components/breadcrumbs.tsx` | Full rewrite: useQuery, useParams, flat breadcrumb builder, simplified rendering |
| `src/infrastructure/repositories/bracket-repository.ts` | Add `getBracketById()` method |
| `src/api/orpc/routes/brackets.ts` | Add `get` procedure |
