// Web component for displaying live heat state (presentation-only)
// All business logic is handled by the backend

interface RiderViewerData {
  riderId: string;
  position: number;
  country: string;
  sailNumber: string;
  lastName: string;
  waveTotal: number;
  jumpTotal: number;
  total: number;
}

interface HeatViewerState {
  heatId: string;
  riders: RiderViewerData[];
}

export class HeatViewer extends HTMLElement {
  private shadow: ShadowRoot;
  private heatId: string | null = null;
  private viewerState: HeatViewerState | null = null;
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly reconnectDelay = 3000;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  static get observedAttributes(): string[] {
    return ["heat-id"];
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
    if (name === "heat-id" && newValue !== this.heatId) {
      this.heatId = newValue;
      if (this.isConnected) {
        this.disconnect();
        this.connect();
      }
    }
  }

  connectedCallback(): void {
    this.heatId = this.getAttribute("heat-id");
    if (!this.heatId) {
      this.renderError("Heat ID is required");
      return;
    }
    this.render();
    this.connect();
    this.loadInitialState();
  }

  disconnectedCallback(): void {
    this.disconnect();
  }

  private async loadInitialState(): Promise<void> {
    if (!this.heatId) return;

    try {
      const host = window.location.host;
      const apiUrl = `${window.location.protocol}//${host}/api/heats/${this.heatId}/viewer`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const state = (await response.json()) as { data: HeatViewerState };
        this.viewerState = state.data;
        this.render();
      }
    } catch (error) {
      console.error("Failed to load initial state:", error);
    }
  }

  private connect(): void {
    if (!this.heatId) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/heats/${this.heatId}/stream`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.clearReconnectTimeout();
        // Subscribe to state updates
        this.ws?.send(
          JSON.stringify({
            type: "subscribe",
            subscriptions: ["state"],
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "state") {
            this.viewerState = message.state;
            this.render();
          } else if (message.type === "ping") {
            this.ws?.send(JSON.stringify({ type: "pong" }));
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      this.scheduleReconnect();
    }
  }

  private disconnect(): void {
    this.clearReconnectTimeout();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimeout();
    this.reconnectTimeout = setTimeout(() => {
      if (this.isConnected && this.heatId) {
        this.connect();
      }
    }, this.reconnectDelay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private renderError(message: string): void {
    this.shadow.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .error {
          padding: 1rem;
          background: #ff4444;
          color: white;
          border-radius: 4px;
        }
      </style>
      <div class="error">${this.escapeHtml(message)}</div>
    `;
  }

  private render(): void {
    if (!this.heatId) {
      this.renderError("Heat ID is required");
      return;
    }

    if (!this.viewerState) {
      this.shadow.innerHTML = `
        <style>
          ${this.getStyles()}
        </style>
        <div class="heat-viewer">
          <div class="header">
            <div class="heat-id">${this.escapeHtml(this.heatId)}</div>
            <div class="timer-container">
              <div class="timer-bar"></div>
              <div class="timer">--:--</div>
            </div>
          </div>
          <div class="loading">Loading...</div>
        </div>
      `;
      return;
    }

    const tableRows = this.viewerState.riders
      .map((rider) => {
        const rankClass = this.getRankClass(rider.position);
        const flagEmoji = this.getCountryFlag(rider.country);

        return `
          <tr>
            <td class="rank ${rankClass}">${rider.position}</td>
            <td class="flag">${flagEmoji}</td>
            <td class="sail-number">${this.escapeHtml(rider.sailNumber)}</td>
            <td class="name">${this.escapeHtml(rider.lastName)}</td>
            <td class="score wave">${rider.waveTotal.toFixed(2)}</td>
            <td class="score jump">${rider.jumpTotal.toFixed(2)}</td>
            <td class="score total">${rider.total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    this.shadow.innerHTML = `
      <style>
        ${this.getStyles()}
      </style>
      <div class="heat-viewer">
        <div class="header">
          <div class="heat-id">${this.escapeHtml(this.viewerState.heatId)}</div>
          <div class="timer-container">
            <div class="timer-bar"></div>
            <div class="timer">--:--</div>
          </div>
        </div>
        <table class="scoreboard">
          <thead>
            <tr>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th>WAVE</th>
              <th>JUMP</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  }

  private getRankClass(position: number): string {
    if (position === 1) return "rank-1";
    if (position === 2) return "rank-2";
    if (position === 3) return "rank-3";
    return "rank-other";
  }

  private getCountryFlag(countryCode: string): string {
    // Map country codes to flag emojis
    const flags: Record<string, string> = {
      GB: "🇬🇧",
      IT: "🇮🇹",
      ES: "🇪🇸",
      FR: "🇫🇷",
      DE: "🇩🇪",
      NL: "🇳🇱",
      PT: "🇵🇹",
      GR: "🇬🇷",
      // Add more as needed
    };
    return flags[countryCode] || "🏳️";
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private getStyles(): string {
    return `
      :host {
        display: block;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .heat-viewer {
        background: #2a2a2a;
        color: white;
        padding: 1rem;
        border-radius: 4px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #444;
      }
      .heat-id {
        font-size: 1.2rem;
        font-weight: bold;
      }
      .timer-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .timer-bar {
        width: 40px;
        height: 8px;
        background: #4caf50;
        border-radius: 2px;
      }
      .timer {
        font-family: monospace;
        font-size: 1.1rem;
        min-width: 60px;
      }
      .loading {
        text-align: center;
        padding: 2rem;
        color: #aaa;
      }
      .scoreboard {
        width: 100%;
        border-collapse: collapse;
      }
      .scoreboard thead th {
        text-align: left;
        padding: 0.5rem;
        font-weight: 600;
        color: white;
        border-bottom: 1px solid #444;
      }
      .scoreboard tbody td {
        padding: 0.75rem 0.5rem;
        border-bottom: 1px solid #333;
      }
      .scoreboard tbody tr:last-child td {
        border-bottom: none;
      }
      .rank {
        text-align: center;
        font-weight: bold;
        width: 50px;
        border-radius: 4px;
        padding: 0.25rem 0.5rem !important;
      }
      .rank-1 {
        background: #4caf50;
        color: white;
      }
      .rank-2 {
        background: #ff9800;
        color: white;
      }
      .rank-3 {
        background: #f44336;
        color: white;
      }
      .rank-other {
        background: transparent;
        color: white;
      }
      .flag {
        text-align: center;
        font-size: 1.5rem;
        width: 50px;
      }
      .sail-number {
        font-family: monospace;
        color: #ccc;
      }
      .name {
        font-weight: 500;
      }
      .score {
        text-align: right;
        font-family: monospace;
        font-weight: 500;
      }
      .score.total {
        font-weight: bold;
      }
    `;
  }
}

customElements.define("heat-viewer", HeatViewer);
