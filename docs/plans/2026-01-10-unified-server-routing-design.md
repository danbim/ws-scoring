# Unified Server Routing Design

**Date:** 2026-01-10
**Status:** Approved

## Goals

1. Easier to read code - single place for all routing logic
2. Shorter code - eliminate redundant fetch fallback
3. Unified API usage - consistent routing patterns throughout

## Current Problems

### Split Routing Logic

The server currently has two places where requests are handled:

1. **`routes` object** (lines 146-487) - Handles all API endpoints using Bun's declarative routing
2. **`fetch` fallback** (lines 488-579) - Handles static file serving with manual if/else logic

This split makes it hard to understand the complete request flow.

### Runtime TypeScript Transpilation

The `/viewer/heat-viewer.js` endpoint builds TypeScript on every request:
- Performance overhead
- Inconsistent with the rest of the app (which uses Vite)
- Unnecessary complexity

### Legacy `/app` Prefix

Code still contains `/app` prefix handling (line 548) that should have been removed per commit `375cd3c`.

## Proposed Solution

### Architecture

**Move everything into the `routes` object** - eliminate the `fetch` function entirely.

### Route Structure

```typescript
routes: {
  // 1. CORS preflight
  "/api/*": { OPTIONS: ... },

  // 2. All API routes (no change)
  "/api/auth/login": { POST: ... },
  "/api/heats": { GET: ..., POST: ... },
  "/api/heats/:heatId": { GET: ..., PUT: ..., DELETE: ... },
  // ... all other API routes

  // 3. WebSocket upgrade (no change)
  "/api/heats/:heatId/stream": async (request, server) => { ... },

  // 4. Static file serving - NEW catch-all route
  "/*": { GET: serveStaticFromDist }
}
```

### Static File Handler

The catch-all `/*` route handler will:

1. Extract pathname from request URL
2. Handle root path: `"/"` → `"/index.html"`
3. Try to serve file from `dist/` folder
4. If file doesn't exist, fallback to `dist/index.html` (SPA client-side routing)
5. If index.html doesn't exist, return 404
6. Set appropriate Content-Type based on file extension
7. Add CORS headers

### Viewer Component Changes

**Before:** Runtime transpilation with `Bun.build` on each request

**After:** Include viewer in Vite build process
- Add `src/viewer/heat-viewer.ts` to Vite build
- Output to `dist/viewer/heat-viewer.js`
- Serve as regular static file (no special handling)

### Code Removals

- Remove entire `fetch` function (lines 488-579)
- Remove `/app` prefix handling
- Remove runtime TypeScript build logic
- Remove special viewer route handling

## Benefits

### 1. Single Source of Truth
All routing logic in the `routes` object - no need to check multiple places.

### 2. Shorter Code
Eliminate ~90 lines of manual path handling and transpilation logic.

### 3. Unified Build Process
Everything goes through Vite → lands in `dist/` → served by catch-all route.

### 4. Better Performance
No runtime transpilation overhead for viewer component.

### 5. Simpler Mental Model
- API routes: explicit paths in routes object
- Static files: catch-all route serves from `dist/`
- No special cases

## Implementation Notes

### Route Order Matters

Bun processes routes in order. The catch-all `"/*"` must come **last** so API routes match first.

### CORS Headers

Static file handler must apply CORS headers using the existing `addCorsHeaders()` function.

### Content-Type Detection

Reuse existing `getContentType()` function to set proper Content-Type headers.

### Error Handling

The static handler should:
- Return 404 with CORS headers if neither file nor index.html exists
- Log errors but continue serving (don't crash server)

## Trade-offs

### Pros
- Much simpler codebase
- Consistent patterns throughout
- Better performance (no runtime builds)
- Easier to understand and maintain

### Cons
- Viewer changes require full Vite rebuild (but you're likely doing this anyway in development)
- Catch-all route is less explicit than specific paths (but this is a standard pattern for SPAs)

## Next Steps

After this design is approved:

1. Update Vite config to include viewer component
2. Implement `serveStaticFromDist` handler function
3. Add catch-all `"/*"` route
4. Remove `fetch` function
5. Test all routes (API, viewer, SPA)
6. Update any documentation
