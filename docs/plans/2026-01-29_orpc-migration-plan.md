Plan to implement                                                                                                                                                                │
│                                                                                                                                                                                  │
│ oRPC Full Migration Plan                                                                                                                                                         │
│                                                                                                                                                                                  │
│ Overview                                                                                                                                                                         │
│                                                                                                                                                                                  │
│ Migrate all remaining API domains from raw Bun.serve() handlers + manual apiGet/apiPost fetch calls to oRPC procedures + @orpc/solid-query. Phase 1 (Seasons) is complete and    │
│ established the pattern.                                                                                                                                                         │
│                                                                                                                                                                                  │
│ What's done: Seasons (5 procedures), oRPC infrastructure (context.ts, router.ts, orpc.ts client), OpenAPI docs at /docs                                                          │
│                                                                                                                                                                                  │
│ What remains: 7 domains, ~45 endpoints, 7 frontend pages                                                                                                                         │
│                                                                                                                                                                                  │
│ What stays as-is: WebSocket endpoints (/api/heats/:heatId/stream, /api/heats/:heatId/head-judge/stream)                                                                          │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Established Pattern (from Phase 1)                                                                                                                                               │
│                                                                                                                                                                                  │
│ Each domain migration follows the same steps:                                                                                                                                    │
│                                                                                                                                                                                  │
│ 1. Create src/api/orpc/routes/<domain>.ts with procedures using existing Zod schemas from src/api/schemas.ts                                                                     │
│ 2. Add the domain to appRouter in src/api/orpc/router.ts                                                                                                                         │
│ 3. Migrate the frontend page from apiGet/apiPost/apiPut/apiDelete to useQuery/useMutation via orpc                                                                               │
│ 4. Write integration tests in __tests__/api/orpc/<domain>.test.ts                                                                                                                │
│ 5. Remove old /api/* routes and handler imports from server.ts                                                                                                                   │
│ 6. Run bun run test:all && bun format && bun check:fix && bun typecheck                                                                                                          │
│                                                                                                                                                                                  │
│ Auth levels (3 procedure builders from context.ts):                                                                                                                              │
│ - publicProcedure — no auth required (viewer, login)                                                                                                                             │
│ - authedProcedure — any authenticated user (judge, head_judge, administrator). Used for reads AND for judge-level writes (score submission, heat creation/completion)            │
│ - adminProcedure — administrator or head_judge only. Used for CRUD management of seasons, contests, divisions, brackets, riders, participants, and heat update/delete            │
│ - formatDate() helper converts domain Date → "YYYY-MM-DD" string                                                                                                                 │
│ - ORPCError("NOT_FOUND") for missing entities                                                                                                                                    │
│ - useQuery(() => orpc.<domain>.<procedure>.queryOptions({ input: {...} })) on frontend                                                                                           │
│ - useMutation(() => orpc.<domain>.<procedure>.mutationOptions({ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.<domain>.key() }) })) for mutations              │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Phase 2: Contests                                                                                                                                                                │
│                                                                                                                                                                                  │
│ Backend: src/api/orpc/routes/contests.ts                                                                                                                                         │
│ ┌───────────┬─────────────────┬───────────────────────────────────────────────────────┬───────────────────────────────────────┬─────────────────────────────────┐                │
│ │ Procedure │      Auth       │                         Input                         │                Output                 │            Replaces             │                │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────┤                │
│ │ list      │ authedProcedure │ { seasonId?: string }                                 │ { contests: contestResponseSchema[] } │ GET /api/contests?seasonId=     │                │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────┤                │
│ │ get       │ authedProcedure │ { contestId: uuid }                                   │ contestResponseSchema                 │ GET /api/contests/:contestId    │                │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────┤                │
│ │ create    │ adminProcedure  │ createContestRequestSchema                            │ contestResponseSchema                 │ POST /api/contests              │                │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────┤                │
│ │ update    │ adminProcedure  │ { contestId: uuid, data: updateContestRequestSchema } │ contestResponseSchema                 │ PUT /api/contests/:contestId    │                │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────┤                │
│ │ delete    │ adminProcedure  │ { contestId: uuid }                                   │ { message: string }                   │ DELETE /api/contests/:contestId │                │
│ └───────────┴─────────────────┴───────────────────────────────────────────────────────┴───────────────────────────────────────┴─────────────────────────────────┘                │
│ Router addition                                                                                                                                                                  │
│                                                                                                                                                                                  │
│ appRouter.contest = { list, get, create, update, delete: deleteContest }                                                                                                         │
│                                                                                                                                                                                  │
│ Frontend: src/app/pages/Contests.tsx                                                                                                                                             │
│                                                                                                                                                                                  │
│ - Replace apiGet("/api/contests?seasonId=...") → useQuery(() => orpc.contest.list.queryOptions({ input: { seasonId } }))                                                         │
│ - Replace apiPost/apiPut/apiDelete → useMutation with orpc.contest.*                                                                                                             │
│ - Remove onMount, loadContests, createSignal for contests/loading                                                                                                                │
│                                                                                                                                                                                  │
│ Tests: __tests__/api/orpc/contests.test.ts                                                                                                                                       │
│                                                                                                                                                                                  │
│ Same pattern as seasons: list (auth/unauth), get (found/404), create (admin/judge), update (admin/judge), delete (admin/judge)                                                   │
│                                                                                                                                                                                  │
│ Cleanup in server.ts                                                                                                                                                             │
│                                                                                                                                                                                  │
│ - Remove /api/contests and /api/contests/:contestId routes                                                                                                                       │
│ - Remove handleCreateContest, handleGetContest, handleListContests, handleUpdateContest, handleDeleteContest imports                                                             │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Phase 3: Divisions                                                                                                                                                               │
│                                                                                                                                                                                  │
│ Backend: src/api/orpc/routes/divisions.ts                                                                                                                                        │
│ ┌───────────┬─────────────────┬─────────────────────────────────────────────────────────┬─────────────────────────────────────────┬───────────────────────────────────┐          │
│ │ Procedure │      Auth       │                          Input                          │                 Output                  │             Replaces              │          │
│ ├───────────┼─────────────────┼─────────────────────────────────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────┤          │
│ │ list      │ authedProcedure │ { contestId?: string }                                  │ { divisions: divisionResponseSchema[] } │ GET /api/divisions?contestId=     │          │
│ ├───────────┼─────────────────┼─────────────────────────────────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────┤          │
│ │ get       │ authedProcedure │ { divisionId: uuid }                                    │ divisionResponseSchema                  │ GET /api/divisions/:divisionId    │          │
│ ├───────────┼─────────────────┼─────────────────────────────────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────┤          │
│ │ create    │ adminProcedure  │ createDivisionRequestSchema                             │ divisionResponseSchema                  │ POST /api/divisions               │          │
│ ├───────────┼─────────────────┼─────────────────────────────────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────┤          │
│ │ update    │ adminProcedure  │ { divisionId: uuid, data: updateDivisionRequestSchema } │ divisionResponseSchema                  │ PUT /api/divisions/:divisionId    │          │
│ ├───────────┼─────────────────┼─────────────────────────────────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────┤          │
│ │ delete    │ adminProcedure  │ { divisionId: uuid }                                    │ { message: string }                     │ DELETE /api/divisions/:divisionId │          │
│ └───────────┴─────────────────┴─────────────────────────────────────────────────────────┴─────────────────────────────────────────┴───────────────────────────────────┘          │
│ Router addition                                                                                                                                                                  │
│                                                                                                                                                                                  │
│ appRouter.division = { list, get, create, update, delete: deleteDivision }                                                                                                       │
│                                                                                                                                                                                  │
│ Frontend: src/app/pages/Divisions.tsx                                                                                                                                            │
│                                                                                                                                                                                  │
│ - Replace apiGet("/api/divisions?contestId=...") and related calls                                                                                                               │
│ - Note: This page also calls apiGet("/api/divisions/:divisionId/participants") — that belongs to Phase 5 (Participants). Keep that call as raw API for now, or migrate           │
│ participants in the same phase if convenient.                                                                                                                                    │
│                                                                                                                                                                                  │
│ Cleanup in server.ts                                                                                                                                                             │
│                                                                                                                                                                                  │
│ - Remove /api/divisions and /api/divisions/:divisionId routes                                                                                                                    │
│ - Remove handleCreateDivision, handleGetDivision, handleListDivisions, handleUpdateDivision, handleDeleteDivision imports                                                        │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Phase 4: Brackets                                                                                                                                                                │
│                                                                                                                                                                                  │
│ Backend: src/api/orpc/routes/brackets.ts                                                                                                                                         │
│ ┌──────────────┬─────────────────┬───────────────────────────────────────────────┬─────────────────────────────────────────────┬──────────────────────────────────────────────── │
│ ─┐                                                                                                                                                                               │
│ │  Procedure   │      Auth       │                     Input                     │                   Output                    │                    Replaces                     │
│  │                                                                                                                                                                               │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────── │
│ ─┤                                                                                                                                                                               │
│ │ list         │ authedProcedure │ { divisionId?: string }                       │ { brackets: bracketResponseSchema[] }       │ GET /api/brackets?divisionId=                   │
│  │                                                                                                                                                                               │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────── │
│ ─┤                                                                                                                                                                               │
│ │ getWithHeats │ authedProcedure │ { bracketId: uuid }                           │ needs custom schema (bracket + nested       │ GET /api/brackets/:bracketId                    │
│  │                                                                                                                                                                               │
│ │              │                 │                                               │ rounds/heats)                               │                                                 │
│  │                                                                                                                                                                               │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────── │
│ ─┤                                                                                                                                                                               │
│ │ create       │ adminProcedure  │ createBracketRequestSchema                    │ bracketResponseSchema                       │ POST /api/brackets                              │
│  │                                                                                                                                                                               │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────── │
│ ─┤                                                                                                                                                                               │
│ │ update       │ adminProcedure  │ { bracketId: uuid, data:                      │ bracketResponseSchema                       │ PUT /api/brackets/:bracketId                    │
│  │                                                                                                                                                                               │
│ │              │                 │ updateBracketRequestSchema }                  │                                             │                                                 │
│  │                                                                                                                                                                               │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────── │
│ ─┤                                                                                                                                                                               │
│ │ delete       │ adminProcedure  │ { bracketId: uuid }                           │ { message: string }                         │ DELETE /api/brackets/:bracketId                 │
│  │                                                                                                                                                                               │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────── │
│ ─┤                                                                                                                                                                               │
│ │ generate     │ adminProcedure  │ { divisionId: uuid, format:                   │ custom schema (generated bracket response)  │ POST                                            │
│  │                                                                                                                                                                               │
│ │              │                 │ "single_elimination" }                        │                                             │ /api/divisions/:divisionId/brackets/generate    │
│  │                                                                                                                                                                               │
│ └──────────────┴─────────────────┴───────────────────────────────────────────────┴─────────────────────────────────────────────┴──────────────────────────────────────────────── │
│ ─┘                                                                                                                                                                               │
│ Note: getWithHeats returns a nested structure (bracket → rounds → heats with rider info). Need to define a response schema for this. Check handleGetBracketWithHeats in          │
│ src/api/routes/bracket-routes.ts for the exact shape.                                                                                                                            │
│                                                                                                                                                                                  │
│ Router addition                                                                                                                                                                  │
│                                                                                                                                                                                  │
│ appRouter.bracket = { list, getWithHeats, create, update, delete: deleteBracket, generate }                                                                                      │
│                                                                                                                                                                                  │
│ Frontend: src/app/pages/Divisions.tsx                                                                                                                                            │
│                                                                                                                                                                                  │
│ - This page renders brackets within divisions — the bracket-related API calls here migrate to orpc.bracket.*                                                                     │
│                                                                                                                                                                                  │
│ Cleanup in server.ts                                                                                                                                                             │
│                                                                                                                                                                                  │
│ - Remove /api/brackets, /api/brackets/:bracketId, /api/divisions/:divisionId/brackets/generate routes                                                                            │
│ - Remove handleCreateBracket, handleListBrackets, handleUpdateBracket, handleDeleteBracket, handleGenerateBracket, handleGetBracketWithHeats imports                             │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Phase 5: Riders & Division Participants                                                                                                                                          │
│                                                                                                                                                                                  │
│ Backend: src/api/orpc/routes/riders.ts                                                                                                                                           │
│ ┌───────────┬─────────────────┬───────────────────────────────────────────────────┬───────────────────────────────────┬─────────────────────────────┐                            │
│ │ Procedure │      Auth       │                       Input                       │              Output               │          Replaces           │                            │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────┼───────────────────────────────────┼─────────────────────────────┤                            │
│ │ list      │ authedProcedure │ { includeDeleted?: boolean }                      │ { riders: riderResponseSchema[] } │ GET /api/riders             │                            │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────┼───────────────────────────────────┼─────────────────────────────┤                            │
│ │ get       │ authedProcedure │ { riderId: uuid }                                 │ riderResponseSchema               │ GET /api/riders/:riderId    │                            │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────┼───────────────────────────────────┼─────────────────────────────┤                            │
│ │ create    │ adminProcedure  │ createRiderRequestSchema                          │ riderResponseSchema               │ POST /api/riders            │                            │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────┼───────────────────────────────────┼─────────────────────────────┤                            │
│ │ update    │ adminProcedure  │ { riderId: uuid, data: updateRiderRequestSchema } │ riderResponseSchema               │ PUT /api/riders/:riderId    │                            │
│ ├───────────┼─────────────────┼───────────────────────────────────────────────────┼───────────────────────────────────┼─────────────────────────────┤                            │
│ │ delete    │ adminProcedure  │ { riderId: uuid }                                 │ { message: string }               │ DELETE /api/riders/:riderId │                            │
│ └───────────┴─────────────────┴───────────────────────────────────────────────────┴───────────────────────────────────┴─────────────────────────────┘                            │
│ Backend: src/api/orpc/routes/participants.ts                                                                                                                                     │
│ ┌───────────┬─────────────────┬─────────────────────────────────────┬─────────────────────────────────────────┬─────────────────────────────────────────────────────────┐        │
│ │ Procedure │      Auth       │                Input                │                 Output                  │                        Replaces                         │        │
│ ├───────────┼─────────────────┼─────────────────────────────────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────────┤        │
│ │ list      │ authedProcedure │ { divisionId: uuid }                │ { participants: riderResponseSchema[] } │ GET /api/divisions/:divisionId/participants             │        │
│ ├───────────┼─────────────────┼─────────────────────────────────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────────┤        │
│ │ add       │ adminProcedure  │ { divisionId: uuid, riderId: uuid } │ { message: string }                     │ POST /api/divisions/:divisionId/participants            │        │
│ ├───────────┼─────────────────┼─────────────────────────────────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────────┤        │
│ │ remove    │ adminProcedure  │ { divisionId: uuid, riderId: uuid } │ { message: string }                     │ DELETE /api/divisions/:divisionId/participants/:riderId │        │
│ └───────────┴─────────────────┴─────────────────────────────────────┴─────────────────────────────────────────┴─────────────────────────────────────────────────────────┘        │
│ Router addition                                                                                                                                                                  │
│                                                                                                                                                                                  │
│ appRouter.rider = { list, get, create, update, delete: deleteRider }                                                                                                             │
│ appRouter.participant = { list, add, remove }                                                                                                                                    │
│                                                                                                                                                                                  │
│ Frontend                                                                                                                                                                         │
│                                                                                                                                                                                  │
│ - src/app/pages/Riders.tsx → orpc.rider.*                                                                                                                                        │
│ - src/app/pages/DivisionParticipants.tsx → orpc.participant.* and orpc.rider.list                                                                                                │
│ - src/app/pages/Divisions.tsx → replace remaining participant API calls                                                                                                          │
│                                                                                                                                                                                  │
│ Cleanup in server.ts                                                                                                                                                             │
│                                                                                                                                                                                  │
│ - Remove /api/riders, /api/riders/:riderId, /api/divisions/:divisionId/participants, /api/divisions/:divisionId/participants/:riderId routes                                     │
│ - Remove all rider/participant handler imports                                                                                                                                   │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Phase 6: Heats & Scores                                                                                                                                                          │
│                                                                                                                                                                                  │
│ This is the largest domain. Split procedures across two files.                                                                                                                   │
│                                                                                                                                                                                  │
│ Backend: src/api/orpc/routes/heats.ts                                                                                                                                            │
│ ┌──────────────┬─────────────────┬───────────────────────────────────────────────────┬─────────────────────────────────┬───────────────────────────────────┐                     │
│ │  Procedure   │      Auth       │                       Input                       │             Output              │             Replaces              │                     │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤                     │
│ │ list         │ authedProcedure │ { bracketId?: string }                            │ { heats: heatResponseSchema[] } │ GET /api/heats                    │                     │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤                     │
│ │ get          │ authedProcedure │ { heatId: string }                                │ heat response schema            │ GET /api/heats/:heatId            │                     │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤                     │
│ │ create       │ authedProcedure │ createHeatRequestSchema                           │ heat response schema            │ POST /api/heats                   │                     │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤                     │
│ │ update       │ adminProcedure  │ { heatId: string, data: updateHeatRequestSchema } │ heat response schema            │ PUT /api/heats/:heatId            │                     │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤                     │
│ │ delete       │ adminProcedure  │ { heatId: string }                                │ { message: string }             │ DELETE /api/heats/:heatId         │                     │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤                     │
│ │ complete     │ authedProcedure │ { heatId: string }                                │ heat response schema            │ POST /api/heats/:heatId/complete  │                     │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤                     │
│ │ getViewer    │ publicProcedure │ { heatId: string }                                │ viewer response schema          │ GET /api/heats/:heatId/viewer     │                     │
│ ├──────────────┼─────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤                     │
│ │ getHeadJudge │ adminProcedure  │ { heatId: string }                                │ head judge response schema      │ GET /api/heats/:heatId/head-judge │                     │
│ └──────────────┴─────────────────┴───────────────────────────────────────────────────┴─────────────────────────────────┴───────────────────────────────────┘                     │
│ Note: heatId uses z.string() (not .uuid()) because heat IDs in this app are not UUIDs — they're composite keys like bracket position identifiers. Check existing schemas.        │
│                                                                                                                                                                                  │
│ Backend: src/api/orpc/routes/scores.ts                                                                                                                                           │
│ ┌────────────┬─────────────────┬───────────────────────────────────────────────────────────┬─────────────────────┬──────────────────────────────────────────────────┐            │
│ │ Procedure  │      Auth       │                           Input                           │       Output        │                     Replaces                     │            │
│ ├────────────┼─────────────────┼───────────────────────────────────────────────────────────┼─────────────────────┼──────────────────────────────────────────────────┤            │
│ │ addWave    │ authedProcedure │ addWaveScoreRequestSchema                                 │ score response      │ POST /api/heats/:heatId/scores/wave              │            │
│ ├────────────┼─────────────────┼───────────────────────────────────────────────────────────┼─────────────────────┼──────────────────────────────────────────────────┤            │
│ │ updateWave │ authedProcedure │ { heatId, scoreUUID, data: updateWaveScoreRequestSchema } │ score response      │ PUT /api/heats/:heatId/scores/wave/:scoreUUID    │            │
│ ├────────────┼─────────────────┼───────────────────────────────────────────────────────────┼─────────────────────┼──────────────────────────────────────────────────┤            │
│ │ deleteWave │ authedProcedure │ { heatId, scoreUUID }                                     │ { message: string } │ DELETE /api/heats/:heatId/scores/wave/:scoreUUID │            │
│ ├────────────┼─────────────────┼───────────────────────────────────────────────────────────┼─────────────────────┼──────────────────────────────────────────────────┤            │
│ │ addJump    │ authedProcedure │ addJumpScoreRequestSchema                                 │ score response      │ POST /api/heats/:heatId/scores/jump              │            │
│ ├────────────┼─────────────────┼───────────────────────────────────────────────────────────┼─────────────────────┼──────────────────────────────────────────────────┤            │
│ │ updateJump │ authedProcedure │ { heatId, scoreUUID, data: updateJumpScoreRequestSchema } │ score response      │ PUT /api/heats/:heatId/scores/jump/:scoreUUID    │            │
│ ├────────────┼─────────────────┼───────────────────────────────────────────────────────────┼─────────────────────┼──────────────────────────────────────────────────┤            │
│ │ deleteJump │ authedProcedure │ { heatId, scoreUUID }                                     │ { message: string } │ DELETE /api/heats/:heatId/scores/jump/:scoreUUID │            │
│ └────────────┴─────────────────┴───────────────────────────────────────────────────────────┴─────────────────────┴──────────────────────────────────────────────────┘            │
│ Router addition                                                                                                                                                                  │
│                                                                                                                                                                                  │
│ appRouter.heat = { list, get, create, update, delete: deleteHeat, complete, getViewer, getHeadJudge }                                                                            │
│ appRouter.score = { addWave, updateWave, deleteWave, addJump, updateJump, deleteJump }                                                                                           │
│                                                                                                                                                                                  │
│ Frontend                                                                                                                                                                         │
│                                                                                                                                                                                  │
│ - src/app/pages/HeatScoreSheet.tsx → orpc.heat.get, orpc.score.*, orpc.heat.complete                                                                                             │
│ - src/app/pages/HeadJudgeView.tsx → orpc.heat.getHeadJudge, orpc.heat.complete                                                                                                   │
│                                                                                                                                                                                  │
│ Note: These pages use WebSocket for real-time updates. The WebSocket endpoints stay as-is. The initial data load and score submission switch to oRPC, but live updates still     │
│ come via WebSocket.                                                                                                                                                              │
│                                                                                                                                                                                  │
│ Response schemas needed                                                                                                                                                          │
│                                                                                                                                                                                  │
│ The heat and head-judge responses are complex nested objects. Need to define output Zod schemas based on the actual shapes returned by handleGetHeat, handleGetHeatViewer, and   │
│ handleGetHeadJudgeHeat. Check the handler implementations for exact shapes.                                                                                                      │
│                                                                                                                                                                                  │
│ Cleanup in server.ts                                                                                                                                                             │
│                                                                                                                                                                                  │
│ - Remove all /api/heats/* routes EXCEPT the WebSocket upgrade routes (/api/heats/:heatId/stream, /api/heats/:heatId/head-judge/stream)                                           │
│ - Remove all heat/score handler imports                                                                                                                                          │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Phase 7: Authentication                                                                                                                                                          │
│                                                                                                                                                                                  │
│ Backend: src/api/orpc/routes/auth.ts                                                                                                                                             │
│ ┌───────────┬─────────────────┬────────────────────┬───────────────────────────────────┬───────────────────────┐                                                                 │
│ │ Procedure │      Auth       │       Input        │              Output               │       Replaces        │                                                                 │
│ ├───────────┼─────────────────┼────────────────────┼───────────────────────────────────┼───────────────────────┤                                                                 │
│ │ login     │ publicProcedure │ loginRequestSchema │ custom (user + set-cookie header) │ POST /api/auth/login  │                                                                 │
│ ├───────────┼─────────────────┼────────────────────┼───────────────────────────────────┼───────────────────────┤                                                                 │
│ │ logout    │ authedProcedure │ none               │ { message: string }               │ POST /api/auth/logout │                                                                 │
│ ├───────────┼─────────────────┼────────────────────┼───────────────────────────────────┼───────────────────────┤                                                                 │
│ │ me        │ authedProcedure │ none               │ userResponseSchema                │ GET /api/auth/me      │                                                                 │
│ └───────────┴─────────────────┴────────────────────┴───────────────────────────────────┴───────────────────────┘                                                                 │
│ Important: login needs to set a Set-Cookie header on the response. oRPC procedures return data, not raw responses. Options:                                                      │
│ 1. Use oRPC's response header injection if available                                                                                                                             │
│ 2. Keep login as a raw /api/auth/login endpoint and only migrate logout and me                                                                                                   │
│ 3. Use an oRPC interceptor/plugin to set cookies based on procedure output                                                                                                       │
│                                                                                                                                                                                  │
│ Investigate oRPC's cookie/header handling before implementing. This is the trickiest endpoint because it requires response header manipulation.                                  │
│                                                                                                                                                                                  │
│ Frontend: src/app/contexts/AuthContext.tsx                                                                                                                                       │
│                                                                                                                                                                                  │
│ - The auth context likely uses raw fetch for login/logout/me                                                                                                                     │
│ - Migrate to orpc.auth.* calls (or keep raw fetch for login if cookie handling is problematic)                                                                                   │
│                                                                                                                                                                                  │
│ Router addition                                                                                                                                                                  │
│                                                                                                                                                                                  │
│ appRouter.auth = { login, logout, me }                                                                                                                                           │
│                                                                                                                                                                                  │
│ Cleanup in server.ts                                                                                                                                                             │
│                                                                                                                                                                                  │
│ - Remove /api/auth/login, /api/auth/logout, /api/auth/me routes                                                                                                                  │
│ - Remove handleLogin, handleLogout, handleGetMe imports                                                                                                                          │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Final Cleanup (after all phases)                                                                                                                                                 │
│                                                                                                                                                                                  │
│ 1. Remove src/app/utils/api.ts — no more raw API calls                                                                                                                           │
│ 2. Remove unused handler files — if all exports from a handler file are migrated, delete the file:                                                                               │
│   - src/api/routes/contest-routes.ts (after Phases 2-4)                                                                                                                          │
│   - src/api/routes/heat-routes.ts (after Phase 6)                                                                                                                                │
│   - src/api/routes/rider-routes.ts (after Phase 5)                                                                                                                               │
│   - src/api/routes/head-judge-routes.ts (after Phase 6)                                                                                                                          │
│   - src/api/routes/auth.ts (after Phase 7)                                                                                                                                       │
│ 3. Remove src/api/helpers.ts — withAuth/withRoleAuth wrappers no longer needed                                                                                                   │
│ 4. Remove src/api/middleware/auth.ts — cookie parsing moved to oRPC context                                                                                                      │
│ 5. Remove src/app/types.ts — replace with types inferred from oRPC schemas (RouterClient inference)                                                                              │
│ 6. Remove /api/* OPTIONS handler and addCorsHeaders from server.ts — CORSPlugin handles everything                                                                               │
│ 7. Clean up src/api/schemas.ts — remove any unused schemas/types                                                                                                                 │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Execution Order & Dependencies                                                                                                                                                   │
│                                                                                                                                                                                  │
│ Phase 2 (Contests) ──┐                                                                                                                                                           │
│ Phase 3 (Divisions) ──┤── can be done sequentially, each is independent                                                                                                          │
│ Phase 4 (Brackets) ──┘   but share the same pattern                                                                                                                              │
│                                                                                                                                                                                  │
│ Phase 5 (Riders & Participants) ── independent of above                                                                                                                          │
│                                                                                                                                                                                  │
│ Phase 6 (Heats & Scores) ── largest phase, depends on understanding                                                                                                              │
│                               response shapes from existing handlers                                                                                                             │
│                                                                                                                                                                                  │
│ Phase 7 (Auth) ── do last, needs cookie/header investigation                                                                                                                     │
│                                                                                                                                                                                  │
│ Final Cleanup ── after all phases verified working                                                                                                                               │
│                                                                                                                                                                                  │
│ Phases 2-5 are straightforward CRUD following the Season pattern. Phase 6 requires more work due to complex response shapes and WebSocket coexistence. Phase 7 needs             │
│ investigation into oRPC cookie handling.                                                                                                                                         │
│                                                                                                                                                                                  │
│ ---                                                                                                                                                                              │
│ Verification (per phase)                                                                                                                                                         │
│                                                                                                                                                                                  │
│ bun run test:all        # All tests pass (existing + new)                                                                                                                        │
│ bun format              # Code formatted                                                                                                                                         │
│ bun check:fix           # Lint clean                                                                                                                                             │
│ bun typecheck           # Type-safe end-to-end                                                                                                                                   │
│                                                                                                                                                                                  │
│ Manual: start dev servers, verify the migrated page works (load, create, edit, delete), verify network tab shows /rpc calls not /api calls, verify OpenAPI docs at /docs include │
│  new procedures.