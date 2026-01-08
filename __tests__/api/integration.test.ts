import { beforeEach, describe, expect, it } from "bun:test";
import type { ServerWebSocket } from "bun";
import { eq } from "drizzle-orm";
import {
  handleAddJumpScore,
  handleAddWaveScore,
  handleCreateHeat,
  handleGetHeat,
} from "../../src/api/routes.js";
import { addConnection, setSubscriptions } from "../../src/api/websocket.js";
import { getDb } from "../../src/infrastructure/db/index.js";
import {
  brackets,
  contests,
  divisions,
  riders,
  seasons,
  users,
} from "../../src/infrastructure/db/schema.js";
import { createHeatRepository } from "../../src/infrastructure/repositories/index.js";
import {
  createHeatRequest,
  createJumpScoreRequest,
  createWaveScoreRequest,
  DEFAULT_TEST_BRACKET_ID,
  DEFAULT_TEST_JUDGE_ID,
  RIDER_1,
  RIDER_2,
} from "./shared.js";

// Mock WebSocket for testing
class MockWebSocket {
  readyState: "open" | "closed" = "open";
  sentMessages: string[] = [];
  subscriptions?: { events: boolean; state: boolean };
  private _data: { heatId?: string } = { heatId: "integration-heat" };

  send(message: string): void {
    this.sentMessages.push(message);
  }

  close(): void {
    this.readyState = "closed";
  }

  get data(): { heatId?: string } {
    return this._data;
  }

  setHeatId(heatId: string): void {
    this._data = { heatId };
  }
}

describe("API Integration Tests", () => {
  // Test IDs for foreign key relationships
  const TEST_SEASON_ID = "00000000-0000-0000-0000-000000000001";
  const TEST_CONTEST_ID = "00000000-0000-0000-0000-000000000002";
  const TEST_DIVISION_ID = "00000000-0000-0000-0000-000000000003";
  const TEST_RIDER_1_ID = RIDER_1;
  const TEST_RIDER_2_ID = RIDER_2;

  beforeEach(async () => {
    const heatRepository = createHeatRepository();
    const db = await getDb();

    // Ensure test data hierarchy exists
    const [existingSeason] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.id, TEST_SEASON_ID))
      .limit(1);
    if (!existingSeason) {
      await db.insert(seasons).values({
        id: TEST_SEASON_ID,
        name: "Test Season",
        year: 2025,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      });
    }

    const [existingContest] = await db
      .select()
      .from(contests)
      .where(eq(contests.id, TEST_CONTEST_ID))
      .limit(1);
    if (!existingContest) {
      await db.insert(contests).values({
        id: TEST_CONTEST_ID,
        seasonId: TEST_SEASON_ID,
        name: "Test Contest",
        location: "Test Location",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-07"),
        status: "in_progress",
      });
    }

    const [existingDivision] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, TEST_DIVISION_ID))
      .limit(1);
    if (!existingDivision) {
      await db.insert(divisions).values({
        id: TEST_DIVISION_ID,
        contestId: TEST_CONTEST_ID,
        name: "Test Division",
        category: "pro_men",
      });
    }

    const [existingBracket] = await db
      .select()
      .from(brackets)
      .where(eq(brackets.id, DEFAULT_TEST_BRACKET_ID))
      .limit(1);
    if (!existingBracket) {
      await db.insert(brackets).values({
        id: DEFAULT_TEST_BRACKET_ID,
        divisionId: TEST_DIVISION_ID,
        name: "Test Bracket",
        format: "single_elimination",
        status: "in_progress",
      });
    }

    // Ensure test judge exists
    const [existingJudge] = await db
      .select()
      .from(users)
      .where(eq(users.id, DEFAULT_TEST_JUDGE_ID))
      .limit(1);
    if (!existingJudge) {
      await db.insert(users).values({
        id: DEFAULT_TEST_JUDGE_ID,
        username: "testjudge",
        email: "test-judge@example.com",
        passwordHash: "test-password-hash",
        role: "judge",
      });
    }

    // Ensure test riders exist
    const [existingRider1] = await db
      .select()
      .from(riders)
      .where(eq(riders.id, TEST_RIDER_1_ID))
      .limit(1);
    if (!existingRider1) {
      await db.insert(riders).values({
        id: TEST_RIDER_1_ID,
        firstName: "Test",
        lastName: "Rider One",
        country: "US",
        sailNumber: "US-1",
      });
    }

    const [existingRider2] = await db
      .select()
      .from(riders)
      .where(eq(riders.id, TEST_RIDER_2_ID))
      .limit(1);
    if (!existingRider2) {
      await db.insert(riders).values({
        id: TEST_RIDER_2_ID,
        firstName: "Test",
        lastName: "Rider Two",
        country: "US",
        sailNumber: "US-2",
      });
    }

    // Clean up all heats
    const allHeats = await heatRepository.getAllHeats();
    for (const heat of allHeats) {
      await heatRepository.deleteHeat(heat.heatId);
    }
  });

  describe("REST API → WebSocket Broadcasting Flow", () => {
    it("should broadcast events to WebSocket clients when heat is created", async () => {
      const heatId = `integration-heat-${Date.now()}`;

      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      (mockWs as unknown as { readyState: string }).readyState = "open";

      addConnection(heatId, mockWs);
      setSubscriptions(heatId, mockWs, { events: true, state: true });

      // Create heat via REST API
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1, RIDER_2],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      const response = await handleCreateHeat(createRequest);
      expect(response.status).toBe(200);

      // Check that WebSocket client received messages
      const messages = (mockWs as unknown as MockWebSocket).sentMessages;
      expect(messages.length).toBeGreaterThan(0);

      // Should receive state message (no more event messages with new architecture)
      const stateMessage = messages.find((msg) => {
        const parsed = JSON.parse(msg as string);
        return parsed.type === "state";
      });
      expect(stateMessage).toBeDefined();

      // Verify state message contains the heat
      const parsed = JSON.parse(stateMessage as string);
      expect(parsed.state.heatId).toBe(heatId);
    });

    it("should broadcast events to WebSocket clients when score is added", async () => {
      const heatId = `integration-heat-score-${Date.now()}`;
      // Create heat first
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      // Set up WebSocket connection
      const mockWs = new MockWebSocket() as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      (mockWs as unknown as { readyState: string }).readyState = "open";

      addConnection(heatId, mockWs);
      setSubscriptions(heatId, mockWs, { events: true, state: true });

      // Clear previous messages
      (mockWs as unknown as MockWebSocket).sentMessages = [];

      // Add wave score via REST API
      const scoreRequest = createWaveScoreRequest(heatId, {
        scoreUUID: "wave-1",
        riderId: RIDER_1,
        waveScore: 8.5,
      });

      const response = await handleAddWaveScore(scoreRequest);
      expect(response.status).toBe(200);

      // Check that WebSocket client received messages
      const messages = (mockWs as unknown as MockWebSocket).sentMessages;
      expect(messages.length).toBeGreaterThan(0);

      // Should receive state message with updated score (no more event messages)
      const stateMessage = messages.find((msg) => {
        const parsed = JSON.parse(msg as string);
        return parsed.type === "state";
      });
      expect(stateMessage).toBeDefined();

      if (stateMessage) {
        const parsed = JSON.parse(stateMessage as string);
        // Verify it's HeatViewerState structure
        expect(parsed.state.riders).toBeDefined();
        expect(Array.isArray(parsed.state.riders)).toBe(true);
        // Should have at least one rider with the score reflected
        expect(parsed.state.riders.length).toBeGreaterThan(0);
        const rider = parsed.state.riders.find((r: { riderId: string }) => r.riderId === RIDER_1);
        expect(rider).toBeDefined();
        if (rider) {
          expect(rider.waveTotal).toBe(8.5);
        }
        // Should not have raw scores
        expect(parsed.state.scores).toBeUndefined();
      }
    });

    it("should update heat state correctly after multiple score additions", async () => {
      const heatId = `integration-heat-multi-${Date.now()}`;
      // Create heat
      const createRequest = createHeatRequest(heatId, {
        riderIds: [RIDER_1, RIDER_2],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      // Add multiple scores
      const waveScore1 = createWaveScoreRequest(heatId, {
        scoreUUID: "wave-1",
        riderId: RIDER_1,
        waveScore: 8.5,
      });

      await handleAddWaveScore(waveScore1);

      const waveScore2 = createWaveScoreRequest(heatId, {
        scoreUUID: "wave-2",
        riderId: RIDER_2,
        waveScore: 9.0,
      });

      await handleAddWaveScore(waveScore2);

      const jumpScore = createJumpScoreRequest(heatId, {
        scoreUUID: "jump-1",
        riderId: RIDER_1,
        jumpScore: 9.5,
        jumpType: "forward",
      });

      await handleAddJumpScore(jumpScore);

      // Get final state via REST API
      const getResponse = await handleGetHeat(heatId);
      expect(getResponse.status).toBe(200);

      const state = (await getResponse.json()) as {
        heatId: string;
        scores: Array<{
          type: string;
          scoreUUID: string;
          riderId: string;
          score: number;
        }>;
      };

      expect(state.scores).toHaveLength(3);
      expect(state.scores.find((s) => s.scoreUUID === "wave-1")).toBeDefined();
      expect(state.scores.find((s) => s.scoreUUID === "wave-2")).toBeDefined();
      expect(state.scores.find((s) => s.scoreUUID === "jump-1")).toBeDefined();
    });

    it("should only send events to clients subscribed to events", async () => {
      const testHeatId = `integration-heat-events-${Date.now()}`;
      const mockWsEventsBase = new MockWebSocket();
      mockWsEventsBase.setHeatId(testHeatId);
      const mockWsEvents = mockWsEventsBase as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      mockWsEventsBase.readyState = "open";

      const mockWsStateBase = new MockWebSocket();
      mockWsStateBase.setHeatId(testHeatId);
      const mockWsState = mockWsStateBase as unknown as ServerWebSocket<{
        heatId?: string;
      }>;
      mockWsStateBase.readyState = "open";

      addConnection(testHeatId, mockWsEvents);
      addConnection(testHeatId, mockWsState);

      setSubscriptions(testHeatId, mockWsEvents, {
        events: true,
        state: false,
      });
      setSubscriptions(testHeatId, mockWsState, { events: false, state: true });

      // Create heat
      const createRequest = createHeatRequest(testHeatId, {
        riderIds: [RIDER_1],
        bracketId: DEFAULT_TEST_BRACKET_ID,
      });

      await handleCreateHeat(createRequest);

      // Check messages - wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      const eventsMessages = mockWsEventsBase.sentMessages;
      const stateMessages = mockWsStateBase.sentMessages;

      // Events-only client should NOT receive messages (no more events in new architecture)
      expect(eventsMessages.length).toBe(0);

      // State-only client should receive state messages
      const stateReceived = stateMessages.some((msg) => {
        try {
          const parsed = JSON.parse(msg as string);
          return parsed.type === "state";
        } catch {
          return false;
        }
      });
      expect(stateReceived).toBe(true);
    });
  });
});
