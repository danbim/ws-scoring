# Head Judge Screen Design

**Date:** 2026-01-12
**Status:** Approved
**Author:** Design Session

## Overview

This document describes the design for a head judge screen that displays all judges' score sheets in parallel with live updates. The screen provides a comprehensive control panel for head judges to monitor scoring activity, validate consistency across judges, and maintain oversight of competition heats.

### Goals

- Display multiple judges' score sheets side-by-side in real-time
- Auto-discover judges as they submit their first scores
- Enable head judge to edit any score or add scores on behalf of judges
- Validate judge agreement before heat completion
- Provide multiple navigation entry points
- Maintain role-based access control

### Non-Goals (Future Enhancements)

- Audit logging of score edits (future)
- Advanced analytics and timing metrics (future)
- Export/reporting features (future)
- Sound notifications (future)
- Optimistic locking for concurrent edits (unnecessary - single head judge in practice)

## Architecture & Data Flow

### Core Architecture

**Component Structure:**
- `HeadJudgeView.tsx` - Main head judge screen showing all judges' columns
- `JudgeScoreColumn.tsx` - Reusable individual judge score sheet column component
- `HeatCompletionModal.tsx` - Validation modal for heat completion
- `/ws/head-judge/{heatId}` - Authenticated WebSocket endpoint for real-time updates
- `GET /api/heats/{heatId}/head-judge` - Initial state fetch with role-based auth

**Data Flow:**

1. Head judge navigates to head judge view (from bracket or judge screen)
2. Frontend verifies user role (`head_judge` or `administrator`)
3. Initial state fetched via REST API with full authentication
4. WebSocket connection established to `/ws/head-judge/{heatId}`
5. Server validates WebSocket connection has `head_judge` or `administrator` role
6. Real-time updates pushed as judges submit scores
7. Judge columns auto-appear when judges submit their first score
8. Head judge can edit any score, triggering broadcasts to all connected clients

**Authentication & Authorization:**
- REST endpoint checks `request.user.role` is `head_judge` or `administrator`
- WebSocket upgrade validates session token and role before accepting connection
- Separate from viewer WebSocket (future-proofed for restricted viewer data)
- Frontend routes protected by role check in auth context

**System Capability Assessment:**

The existing system fully supports multiple judges scoring the same heat:

✅ **Database schema** - Each score has a `judgeId` field (schema.ts:206-208)
✅ **Score calculation** - All calculation functions accept `judgeId` parameter and filter by judge
✅ **Multi-judge averaging** - `calculateRiderScoreTotals` averages scores across all judges
✅ **API support** - Routes capture `judgeId` from authenticated user
✅ **Storage** - ScoreRepository stores/retrieves scores with judge information
✅ **Real-time updates** - WebSocket broadcasts full heat state with all judges' scores

**No backend changes needed for multi-judge functionality - only new presentation layer and dedicated WebSocket endpoint.**

## UI Layout & Responsive Behavior

### Desktop Layout

**Overall Structure:**
- Fixed header showing heat information (heat ID, round name, rules)
- Horizontally scrolling container for judge columns
- Each judge column is a fixed-width panel (350-400px)
- Columns dynamically shrink to fit available width (responsive columns)
- Minimum column width enforced (280px) before horizontal scroll activates

**Judge Column Layout:**

Each column replicates the current `HeatScoreSheet` structure:
- Header with judge name/ID and color coding for visual distinction
- Two sub-columns: WAVES and JUMPS
- Score cards showing full detail:
  - Score value
  - Jump type and modifiers (for jumps)
  - Timestamp/age
  - Visual highlighting for counting scores
- Rider totals at the bottom of each column
- Add score buttons (when head judge clicks, modal opens with judge context)

**Responsive Column Behavior:**
- 1 judge: Column takes ~90% width (centered, comfortable spacing)
- 2 judges: Each column ~45% width (side-by-side, easy comparison)
- 3 judges: Each column ~30% width (all visible on typical desktop)
- 4+ judges: Columns shrink to minimum width (280px), horizontal scroll appears
- Smooth transitions as columns appear/disappear

**Mobile/Tablet Handling:**
- Show warning message: "Head Judge view requires a desktop or large tablet in landscape mode"
- Provide link to regular judge scoring view as alternative
- Minimum viewport width: 1024px to access head judge view

## Real-Time Updates & Judge Discovery

### WebSocket Implementation

**New WebSocket Endpoint: `/ws/head-judge/{heatId}`**

**Connection Flow:**
1. Client initiates WebSocket upgrade with session token in headers
2. Server validates token and extracts user information
3. Authorization check: Verify `user.role` is `head_judge` or `administrator`
4. If authorized, accept connection and add to head-judge-specific connection pool
5. Send initial state message with full heat data (all judges, all scores)

**Message Types (Server → Client):**

```typescript
{
  type: "head_judge_state",
  state: {
    heatId: string,
    riders: RiderInfo[],
    heatRules: { wavesCounting: number, jumpsCounting: number },
    judges: JudgeScoreSheet[],  // Array of complete judge scoresheets
    completedAt: Date | null
  }
}

{
  type: "ping"  // Heartbeat (reuse existing pattern)
}
```

**JudgeScoreSheet Structure:**

```typescript
{
  judgeId: string,
  judgeName: string,
  scores: Score[],  // All scores from this judge
  riderTotals: Record<string, number>  // Per-rider totals for this judge
}
```

**Message Types (Client → Server):**

```typescript
{
  type: "subscribe",
  subscriptions: ["state"]  // Reuse existing pattern
}

{
  type: "pong"  // Heartbeat response
}
```

**Judge Auto-Discovery:**
- Backend tracks unique `judgeId` values from scores table
- When new judge submits first score, broadcast includes updated judges array
- Frontend detects new judge in state update, renders new column with slide-in animation
- Judges appear in order of first score submission (chronological)

**Update Triggers:**
- Any score added/updated by any judge → broadcast to all head judge connections
- Heat completion → broadcast completion status
- Maintains consistency with existing viewer WebSocket patterns

## Score Editing & Management

### Head Judge Edit Capabilities

**Direct Score Editing:**
- Head judge can click any score card in any judge's column
- Modal opens (reusing existing `WaveScoreModal` or `JumpScoreModal`)
- Modal shows:
  - Original judge's name (e.g., "Editing Judge Sarah's score")
  - Rider information
  - Current score value pre-filled
  - For jumps: jump type and modifiers
- On submit: Score updated via API, `judgeId` remains unchanged
- Visual feedback: Brief highlight on updated score card

**Score Addition by Head Judge:**
- Head judge can add scores on behalf of any judge
- Click "Add wave/jump" button in a judge's column
- Score automatically added with that judge's `judgeId` (implicit assignment)
- New score created and broadcast to all clients

**API Endpoints for Head Judge Editing:**

Reuse existing endpoints:
- `PUT /api/heats/{heatId}/scores/wave/{scoreUUID}`
- `PUT /api/heats/{heatId}/scores/jump/{scoreUUID}`
- `POST /api/heats/{heatId}/scores/wave`
- `POST /api/heats/{heatId}/scores/jump`

**Authorization Update:**

Modify existing authorization checks in `heat-routes.ts`:

```typescript
// In handleUpdateWaveScore (line 454) and handleUpdateJumpScore (line 503)
// Current check:
if (request.user.role === "judge" && existingScore.judgeId !== request.user.id) {
  return createErrorResponse("Forbidden: you can only update your own scores", 403);
}
// Head judge and administrator can edit any score (no additional check needed)
```

**Audit Trail:**
- Currently: `judgeId` remains original judge, no edit tracking
- Score edits preserve original judge attribution
- Future enhancement: Add `lastEditedBy` and `lastEditedAt` fields (out of scope)

## Heat Completion with Validation

### Completion Validation - Judge Agreement Check

**Pre-Completion Validation Modal:**

When head judge clicks "Complete Heat" button:

**Validation Checks:**
- **Wave Count Agreement:** All judges recorded the same number of waves for each rider
- **Jump Catalog Agreement:** All judges recorded the same set of jumps (type + modifiers) for each rider
- Scores can differ - only checking that judges observed the same events

**Rationale:** A heat is a time-limited round where riders can do as many jumps and wave rides as they can, including zero. The validation ensures judges are observing and recording the same events, not whether scores meet a threshold.

**Validation Display Example:**

```
Heat Completion Check

Judges: 3 active (Sarah, Mike, Chen)

Rider #42 (John Doe):
  ✓ Waves: All judges recorded 3 waves
  ⚠ Jumps: Discrepancy detected
    - Judge Sarah: Forward+OH, Backloop, PushLoop (3 jumps)
    - Judge Mike: Forward+OH, Backloop, PushLoop (3 jumps)
    - Judge Chen: Forward+OH, Backloop (2 jumps) ← Missing PushLoop

Rider #88 (Jane Smith):
  ✓ Waves: All judges recorded 5 waves
  ✓ Jumps: All judges recorded Forward, Backloop+OF, TableTop

Status: ⚠ 1 discrepancy found

[ ] I have reviewed the discrepancies and want to proceed
[Cancel] [Complete Heat Anyway]
```

**Discrepancy Detection Logic:**
- Group scores by rider and judge
- For waves: Compare counts across judges
- For jumps: Compare sets of (jumpType, modifiers) across judges
- Flag any differences

**User Flow:**
- No discrepancies: Simple confirmation "Complete heat?"
- With discrepancies: Show detailed list, require acknowledgment checkbox
- Head judge can complete anyway (final authority)

## Navigation & Access Points

### Multiple Entry Points

**Entry Point A: From Bracket View**

**Location:** Bracket display page (where heats are shown)

**Implementation:**
- Add "Head Judge" button/icon next to each heat
- Only visible to users with `head_judge` or `administrator` role
- Button appears alongside existing heat actions
- Icon suggestion: Eye with crown, or clipboard with checkmarks
- Clicking navigates to `/head-judge/heats/{heatId}`

**Visual Example:**
```
Heat 1 - Round of 16
Rider #42 vs Rider #88
[View] [Judge] [Head Judge 👁️‍🗨️]
```

**Entry Point B: From Judge Scoring Screen**

**Location:** Top of `HeatScoreSheet.tsx` (current judge view)

**Implementation:**
- Add toggle/link in header next to heat title
- Only visible to users with `head_judge` or `administrator` role
- Text: "Switch to Head Judge View" or icon button
- Clicking navigates to `/head-judge/heats/{heatId}`
- Preserves current heat context (same heatId)

**Visual Example:**
```
┌─────────────────────────────────────────┐
│ Quarterfinals - Heat 2                  │
│ [← Back] | [Head Judge View →]          │
└─────────────────────────────────────────┘
```

**Entry Point C: Direct Link/Bookmark**

**URL Pattern:** `/head-judge/heats/{heatId}`
- Bookmarkable for quick access
- Shareable with other head judges/admins
- Handles unauthorized access gracefully

**Authorization Handling:**
- Frontend: Check `auth.isHeadJudgeOrAdmin()` before rendering links
- Backend API: Return 403 if role unauthorized
- Frontend route guard: Redirect to login or judge view if unauthorized
- Clear error message: "Head Judge view requires head judge or administrator role"

## Error Handling & Edge Cases

### Error Scenarios & Handling

**WebSocket Connection Issues:**

**Scenario:** WebSocket disconnects during judging
- **Detection:** Connection status indicator (reuse `ConnectionStatusIndicator`)
- **Behavior:**
  - Show warning banner: "Connection lost - attempting to reconnect..."
  - Auto-reconnect with exponential backoff (existing pattern)
  - On reconnect: Fetch latest state, merge with local state
  - Visual feedback when reconnected: "Connected - data refreshed"

**Scenario:** WebSocket authorization fails
- **Detection:** 403 status on WebSocket upgrade
- **Behavior:**
  - Show error message: "Unauthorized - Head Judge access required"
  - Redirect to login or main bracket view
  - Log error for debugging

**Heat State Issues:**

**Scenario:** Heat not found
- **Detection:** API returns 404
- **Behavior:**
  - Show error page: "Heat {heatId} not found"
  - Provide button: "Return to Brackets"

**Scenario:** Heat already completed (locked)
- **Detection:** `completedAt` is not null
- **Behavior:**
  - Show read-only view (no edit buttons)
  - Display banner: "Heat completed on {date}"
  - All score editing disabled
  - Completion button hidden

**No Judges Yet:**

**Scenario:** Heat exists but no judges have scored
- **Behavior:**
  - Show empty state message: "Waiting for judges to submit scores..."
  - Display heat info (riders, rules)
  - No columns shown (judges auto-appear on first score)

**Single Judge:**

**Scenario:** Only one judge has scored so far
- **Behavior:**
  - Show single column (full width or centered)
  - Normal functionality (can add/edit scores)
  - Additional judges appear as they score

**Score Edit Conflicts:**

**Scenario:** Two head judges edit same score simultaneously
- **Mitigation:** Score edit conflicts for two head judges should not occur as there is only ever one head judge in practice. Normal transactional behavior and last-write-wins is sufficient.

## Visual Design & User Experience

### Visual Differentiation

**Judge Column Identification:**

**Color Coding:**
- Each judge gets a unique header color (similar to rider colors)
- Color palette: Distinct, professional colors (blue, green, purple, orange, teal)
- Judge name prominently displayed in column header
- Color helps quick visual scanning across columns

**Column Header Design:**
```
┌─────────────────────────────┐
│ 👤 Judge Sarah Martinez     │  ← Colored background
│ ID: sarah@contest.com       │
│ Active: 2 min ago          │
└─────────────────────────────┘
```

**Score Card Styling:**
- Reuse existing score card design from `HeatScoreSheet.tsx`
- Counting scores: Blue highlight with bold border
- Non-counting scores: Gray background
- Hover state: Subtle lift effect indicating clickable
- Edit mode: Modal overlay with judge context

**Rider Organization:**

**Within Each Column:**
- Riders displayed in consistent order across all judge columns
- Use same rider colors as regular judge view
- Rider headers sticky/repeated for easy scanning
- Side-by-side comparison easy because rider order matches

**Animation & Transitions:**

**New Judge Column Appearing:**
- Slide-in animation from right (smooth, 300ms)
- Brief pulse/glow effect to draw attention

**Score Updates:**
- Brief flash/highlight on updated score card (yellow → normal)
- Smooth number transitions when totals recalculate
- No jarring visual changes

**Loading States:**
- Initial load: Skeleton columns with shimmer effect
- Fetching updates: Subtle spinner in header
- Optimistic updates: Show immediately, rollback on error

## API Specification

### New Backend Endpoints

**REST API Endpoint:**

**`GET /api/heats/{heatId}/head-judge`**

**Purpose:** Fetch complete heat state for head judge view

**Authentication:** Required (session token)

**Authorization:** `head_judge` or `administrator` role only

**Response:**
```typescript
{
  heatId: string,
  heatRules: { wavesCounting: number, jumpsCounting: number },
  riders: Array<{
    riderId: string,
    firstName: string,
    lastName: string,
    sailNumber: string,
    country: string
  }>,
  judges: Array<{
    judgeId: string,
    judgeName: string,  // username or email
    scores: Score[],
    riderTotals: Record<string, number>
  }>,
  bracketId: string,
  position: string,
  roundNumber: number,
  roundName: string,
  completedAt: Date | null
}
```

**Error Responses:**
- 401: Not authenticated
- 403: Not authorized (wrong role)
- 404: Heat not found

**WebSocket Endpoint:**

**`/ws/head-judge/{heatId}`**

**Purpose:** Real-time updates for head judge view

**Authentication:** Session token in upgrade headers

**Authorization:** Validate `head_judge` or `administrator` role during upgrade

**Connection Pool:** Separate from viewer WebSocket connections

**Message Format:** Same as REST API response structure

**Server → Client Messages:**
```typescript
{
  type: "head_judge_state",
  state: HeadJudgeState  // Same structure as REST response
}

{
  type: "ping"  // Heartbeat
}
```

**Client → Server Messages:**
```typescript
{
  type: "subscribe",
  subscriptions: ["state"]  // Reuse existing pattern
}

{
  type: "pong"  // Heartbeat response
}
```

**Broadcast Triggers:**
- Score added by any judge → broadcast to head judge connections
- Score updated by any judge or head judge → broadcast
- Heat completed → broadcast
- Implement new `broadcastHeadJudgeUpdate` similar to existing `broadcastHeatUpdate`

### Modified Endpoints

**No changes to existing score endpoints** - they already support the needed functionality:
- `POST /api/heats/{heatId}/scores/wave`
- `POST /api/heats/{heatId}/scores/jump`
- `PUT /api/heats/{heatId}/scores/wave/{scoreUUID}`
- `PUT /api/heats/{heatId}/scores/jump/{scoreUUID}`
- `POST /api/heats/{heatId}/complete`

**Authorization modification only:** Update role checks in `heat-routes.ts` (lines 454, 503) to allow head judge/admin to edit any score.

## Testing Strategy

### Test Coverage

**Frontend Component Tests:**

**HeadJudgeView.tsx:**
- Renders empty state when no judges have scored
- Displays judge columns when judges present
- Columns appear in correct order (chronological by first score)
- Responsive column width calculations
- Role-based access (redirects if not authorized)
- WebSocket connection and reconnection handling
- Score updates trigger UI refresh

**JudgeScoreColumn.tsx:**
- Renders judge information correctly
- Displays all scores for that judge
- Highlights counting scores correctly
- Click handlers open edit modals with correct context
- Rider totals calculated correctly per judge

**HeatCompletionModal.tsx:**
- Agreement validation detects wave count discrepancies
- Agreement validation detects jump catalog discrepancies
- Shows correct discrepancy details
- Checkbox required when discrepancies exist
- Calls completion API on confirm

**Backend API Tests:**

**GET /api/heats/{heatId}/head-judge:**
- Returns 401 when not authenticated
- Returns 403 when user is regular judge
- Returns 200 with complete data for head judge
- Returns 200 with complete data for administrator
- Returns 404 for non-existent heat
- Groups scores by judge correctly
- Calculates per-judge totals correctly
- Includes rider information

**WebSocket /ws/head-judge/{heatId}:**
- Rejects connection for unauthenticated users
- Rejects connection for regular judge role
- Accepts connection for head judge role
- Accepts connection for administrator role
- Sends initial state on connection
- Broadcasts updates when scores added
- Broadcasts updates when scores edited
- Handles disconnection cleanup

**Authorization Tests:**
- Head judge can edit any judge's scores
- Administrator can edit any judge's scores
- Regular judge cannot edit other judges' scores
- Head judge can add scores as any judge
- Score edits preserve original judgeId

**Integration Tests:**

**Multi-Judge Scoring Workflow:**
1. Create heat with 2 riders
2. Judge A adds wave score for rider 1
3. Verify head judge view shows Judge A column
4. Judge B adds wave score for rider 1
5. Verify head judge view shows both columns
6. Head judge edits Judge A's score
7. Verify score updated, judgeId unchanged
8. Complete heat with validation
9. Verify heat locked, winner calculated

**PGlite Test Database:**
- All tests use isolated PGlite instances (existing pattern)
- Complete database isolation per test file
- No side effects on development database

## Implementation Considerations

### File Structure

**New Files:**

**Frontend:**
- `src/app/pages/HeadJudgeView.tsx` - Main head judge screen component
- `src/app/components/JudgeScoreColumn.tsx` - Individual judge column component
- `src/app/components/HeatCompletionModal.tsx` - Validation modal for heat completion
- `src/app/utils/judgeAgreementValidator.ts` - Logic for detecting discrepancies
- `src/app/utils/judgeColors.ts` - Color assignment for judge columns

**Backend:**
- `src/api/routes/head-judge-routes.ts` - Head judge REST endpoints
- `src/api/websocket-head-judge.ts` - Head judge WebSocket management
- `src/domain/heat/judge-agreement.ts` - Domain logic for agreement validation

**Tests:**
- `__tests__/app/pages/HeadJudgeView.test.tsx`
- `__tests__/app/components/JudgeScoreColumn.test.tsx`
- `__tests__/app/components/HeatCompletionModal.test.tsx`
- `__tests__/api/routes/head-judge-routes.test.ts`
- `__tests__/domain/heat/judge-agreement.test.ts`

**Modified Files:**
- `src/api/routes/heat-routes.ts` - Update authorization checks (lines 454, 503)
- `src/app/pages/HeatScoreSheet.tsx` - Add "Head Judge View" link in header
- `src/app/components/SingleEliminationBracketDesktop.tsx` - Add head judge button
- `src/app/components/SingleEliminationBracketMobile.tsx` - Add head judge button
- `src/app/app.tsx` - Add route for `/head-judge/heats/:heatId`
- `src/api/index.ts` - Register head judge routes and WebSocket handler

### Reusable Components

**Leverage Existing:**
- `WaveScoreModal.tsx` - Reuse for editing wave scores
- `JumpScoreModal.tsx` - Reuse for editing jump scores
- `ConnectionStatusIndicator.tsx` - Reuse for WebSocket status
- Score calculation functions - Reuse all from `score-calculator.ts`
- WebSocket patterns - Follow existing `websocket.ts` structure

**Shared Styling:**
- Rider colors from `riderColors.ts`
- Score card styling from `HeatScoreSheet.tsx`
- Modal patterns from existing modals
- Tailwind classes for consistency

### Implementation Sequence

**Phase 1: Backend Foundation**
1. Create head judge REST API endpoint
2. Update authorization in existing score edit endpoints
3. Add judge agreement validation logic
4. Write backend tests

**Phase 2: WebSocket Integration**
5. Create head judge WebSocket endpoint with auth
6. Implement broadcast logic for head judge connections
7. Add WebSocket connection management
8. Write WebSocket tests

**Phase 3: Frontend Core**
9. Create HeadJudgeView page component
10. Create JudgeScoreColumn component
11. Implement WebSocket connection and state management
12. Add routing and navigation links
13. Write component tests

**Phase 4: Completion & Validation**
14. Create HeatCompletionModal with agreement validation
15. Implement discrepancy detection logic
16. Wire up completion flow
17. Write validation tests

**Phase 5: Polish & Integration**
18. Add responsive column behavior
19. Implement animations and transitions
20. Add error handling and edge cases
21. Integration testing
22. Manual QA testing

### Performance Considerations

**Data Volume:**
- Typical heat: 2-4 riders, 2-3 judges, ~50-100 scores total
- WebSocket payload: ~10-20KB per update (acceptable)
- Column rendering: Virtualization not needed for typical volumes

**Optimization Strategies:**
- Memoize judge column renders (SolidJS memoization)
- Debounce WebSocket state updates if needed (unlikely)
- Lazy load judge columns as they appear
- Reuse calculation functions (already optimized)

**Scalability:**
- Designed for 2-5 judges (typical competition)
- Horizontal scroll handles 6+ judges gracefully
- WebSocket broadcasts efficient (targeted to head judge connections only)

## Summary

### What We're Building

A comprehensive head judge control panel that displays all judges' score sheets side-by-side in real-time, with full editing capabilities and validation before heat completion.

### Key Features

✅ Multi-judge view with responsive columns
✅ Real-time updates via authenticated WebSocket
✅ Full score editing for any judge
✅ Agreement validation before completion
✅ Multiple navigation entry points
✅ Desktop-optimized with mobile fallback
✅ Role-based access control

### Technical Approach

✅ Leverages existing multi-judge infrastructure (no backend changes to scoring logic)
✅ Separate WebSocket endpoint (future-proofed for viewer restrictions)
✅ Reuses existing components and patterns
✅ Comprehensive test coverage

### Out of Scope (Future Enhancements)

- Audit logging of score edits
- Advanced analytics (judge timing, scoring patterns)
- Export/reporting features
- Sound notifications
- Optimistic locking for concurrent edits
