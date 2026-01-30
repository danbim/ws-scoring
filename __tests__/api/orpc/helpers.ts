import { RPCHandler } from "@orpc/server/fetch";
import { appRouter } from "../../../src/api/orpc/router.js";
import { getDb } from "../../../src/infrastructure/db/index.js";
import {
  brackets,
  contests,
  divisionParticipants,
  divisions,
  heats,
  riders,
  seasons,
  sessions,
  users,
} from "../../../src/infrastructure/db/schema.js";

// ---------------------------------------------------------------------------
// RPCHandler instance
// ---------------------------------------------------------------------------

const rpcHandler = new RPCHandler(appRouter);

// ---------------------------------------------------------------------------
// Standard test IDs
// ---------------------------------------------------------------------------

// Users
export const ADMIN_USER_ID = "a0000000-0000-4000-a000-000000000a01";
export const JUDGE_USER_ID = "a0000000-0000-4000-a000-000000000a02";
export const HEAD_JUDGE_USER_ID = "a0000000-0000-4000-a000-000000000a03";

// Session tokens
export const ADMIN_TOKEN = "b0000000-0000-4000-b000-000000000b01";
export const JUDGE_TOKEN = "b0000000-0000-4000-b000-000000000b02";
export const HEAD_JUDGE_TOKEN = "b0000000-0000-4000-b000-000000000b03";

// Hierarchy entities
export const TEST_SEASON_ID = "c0000000-0000-4000-a000-000000000c01";
export const TEST_CONTEST_ID = "c0000000-0000-4000-a000-000000000c02";
export const TEST_DIVISION_ID = "c0000000-0000-4000-a000-000000000c03";
export const TEST_BRACKET_ID = "c0000000-0000-4000-a000-000000000c04";
export const TEST_HEAT_ID = "test-heat-001";

// Riders
export const TEST_RIDER_1_ID = "d0000000-0000-4000-a000-000000000d01";
export const TEST_RIDER_2_ID = "d0000000-0000-4000-a000-000000000d02";

// ---------------------------------------------------------------------------
// rpc() — call an oRPC procedure by dot-notation path
// ---------------------------------------------------------------------------

// biome-ignore lint/suspicious/noExplicitAny: RPC responses have varying shapes per procedure
type RpcData = any;

export interface RpcResult {
  status: number;
  data: RpcData;
}

export async function rpc(
  procedurePath: string,
  input?: unknown,
  cookie?: string
): Promise<RpcResult> {
  const urlPath = procedurePath.replace(/\./g, "/");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers.cookie = cookie;

  const request = new Request(`http://localhost/rpc/${urlPath}`, {
    method: "POST",
    headers,
    body: input !== undefined ? JSON.stringify({ json: input, meta: [] }) : undefined,
  });

  const { matched, response } = await rpcHandler.handle(request, {
    prefix: "/rpc",
    context: { request },
  });

  if (!matched || !response) {
    throw new Error(`No procedure matched for path: ${urlPath}`);
  }

  const body = await response.json();
  return { status: response.status, data: body.json ?? body };
}

// ---------------------------------------------------------------------------
// Shorthand helpers — call rpc() pre-authenticated
// ---------------------------------------------------------------------------

export function rpcAsAdmin(procedurePath: string, input?: unknown): Promise<RpcResult> {
  return rpc(procedurePath, input, `session_token=${ADMIN_TOKEN}`);
}

export function rpcAsJudge(procedurePath: string, input?: unknown): Promise<RpcResult> {
  return rpc(procedurePath, input, `session_token=${JUDGE_TOKEN}`);
}

export function rpcAsHeadJudge(procedurePath: string, input?: unknown): Promise<RpcResult> {
  return rpc(procedurePath, input, `session_token=${HEAD_JUDGE_TOKEN}`);
}

// ---------------------------------------------------------------------------
// seedTestUsers() — insert admin, judge, head_judge + sessions
// ---------------------------------------------------------------------------

export async function seedTestUsers(): Promise<void> {
  const db = await getDb();

  await db.insert(users).values([
    {
      id: ADMIN_USER_ID,
      username: "admin",
      email: null,
      passwordHash: "hashed",
      role: "administrator",
    },
    {
      id: JUDGE_USER_ID,
      username: "judge",
      email: null,
      passwordHash: "hashed",
      role: "judge",
    },
    {
      id: HEAD_JUDGE_USER_ID,
      username: "headjudge",
      email: null,
      passwordHash: "hashed",
      role: "head_judge",
    },
  ]);

  await db.insert(sessions).values([
    {
      userId: ADMIN_USER_ID,
      token: ADMIN_TOKEN,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      userId: JUDGE_USER_ID,
      token: JUDGE_TOKEN,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      userId: HEAD_JUDGE_USER_ID,
      token: HEAD_JUDGE_TOKEN,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  ]);
}

// ---------------------------------------------------------------------------
// seedTestHierarchy() — Season -> Contest -> Division -> Bracket + 2 Riders
// ---------------------------------------------------------------------------

export async function seedTestHierarchy(): Promise<void> {
  const db = await getDb();

  await db.insert(seasons).values({
    id: TEST_SEASON_ID,
    name: "Test Season",
    year: 2025,
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
  });

  await db.insert(contests).values({
    id: TEST_CONTEST_ID,
    seasonId: TEST_SEASON_ID,
    name: "Test Contest",
    location: "Test Beach",
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-06-03"),
    status: "scheduled",
  });

  await db.insert(divisions).values({
    id: TEST_DIVISION_ID,
    contestId: TEST_CONTEST_ID,
    name: "Pro Men",
    category: "pro_men",
  });

  await db.insert(brackets).values({
    id: TEST_BRACKET_ID,
    divisionId: TEST_DIVISION_ID,
    name: "Main Bracket",
    format: "single_elimination",
    status: "draft",
  });

  await db.insert(riders).values([
    {
      id: TEST_RIDER_1_ID,
      firstName: "Rider",
      lastName: "One",
      country: "US",
    },
    {
      id: TEST_RIDER_2_ID,
      firstName: "Rider",
      lastName: "Two",
      country: "BR",
    },
  ]);

  await db.insert(divisionParticipants).values([
    { divisionId: TEST_DIVISION_ID, riderId: TEST_RIDER_1_ID },
    { divisionId: TEST_DIVISION_ID, riderId: TEST_RIDER_2_ID },
  ]);
}

// ---------------------------------------------------------------------------
// seedTestHeat() — insert a heat into the heats table
// ---------------------------------------------------------------------------

export async function seedTestHeat(heatId?: string): Promise<void> {
  const db = await getDb();

  await db.insert(heats).values({
    heatId: heatId ?? TEST_HEAT_ID,
    bracketId: TEST_BRACKET_ID,
    riderIds: JSON.stringify([TEST_RIDER_1_ID, TEST_RIDER_2_ID]),
    wavesCounting: 2,
    jumpsCounting: 1,
    roundNumber: 1,
    roundName: "Round 1",
    position: "H1",
  });
}
