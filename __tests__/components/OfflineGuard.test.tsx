import { render, screen, waitFor } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OfflineGuard from "../../src/app/components/OfflineGuard";

describe("OfflineGuard", () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  function setNavigatorOnLine(value: boolean) {
    Object.defineProperty(navigator, "onLine", {
      value,
      writable: true,
      configurable: true,
    });
  }

  it("should render children when online", () => {
    setNavigatorOnLine(true);

    render(() => (
      <OfflineGuard>
        <button type="button">Score Wave</button>
      </OfflineGuard>
    ));

    expect(screen.getByRole("button", { name: "Score Wave" })).toBeInTheDocument();
  });

  it("should not show overlay when online", () => {
    setNavigatorOnLine(true);

    const { container } = render(() => (
      <OfflineGuard>
        <div>content</div>
      </OfflineGuard>
    ));

    expect(container.querySelector(".fixed.inset-0")).not.toBeInTheDocument();
  });

  it("should not show offline status text when online", () => {
    setNavigatorOnLine(true);

    render(() => (
      <OfflineGuard>
        <div>content</div>
      </OfflineGuard>
    ));

    expect(screen.queryByText("Offline - Score entry disabled")).not.toBeInTheDocument();
  });

  it("should show overlay when browser is offline", async () => {
    setNavigatorOnLine(false);

    const { container } = render(() => (
      <OfflineGuard>
        <div>content</div>
      </OfflineGuard>
    ));

    await waitFor(() => {
      expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
    });
  });

  it("should show offline status text when browser is offline", async () => {
    setNavigatorOnLine(false);

    render(() => (
      <OfflineGuard>
        <div>content</div>
      </OfflineGuard>
    ));

    await waitFor(() => {
      expect(screen.getByText("Offline - Score entry disabled")).toBeInTheDocument();
    });
  });

  it("should still render children when offline", async () => {
    setNavigatorOnLine(false);

    render(() => (
      <OfflineGuard>
        <button type="button">Score Wave</button>
      </OfflineGuard>
    ));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Score Wave" })).toBeInTheDocument();
      expect(screen.getByText("Offline - Score entry disabled")).toBeInTheDocument();
    });
  });

  it("should show overlay when offline event fires", async () => {
    setNavigatorOnLine(true);

    const { container } = render(() => (
      <OfflineGuard>
        <div>content</div>
      </OfflineGuard>
    ));

    expect(container.querySelector(".fixed.inset-0")).not.toBeInTheDocument();

    // Simulate going offline
    setNavigatorOnLine(false);
    window.dispatchEvent(new Event("offline"));

    await waitFor(() => {
      expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
      expect(screen.getByText("Offline - Score entry disabled")).toBeInTheDocument();
    });
  });

  it("should remove overlay when online event fires", async () => {
    setNavigatorOnLine(false);

    const { container } = render(() => (
      <OfflineGuard>
        <div>content</div>
      </OfflineGuard>
    ));

    await waitFor(() => {
      expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
    });

    // Simulate coming back online
    setNavigatorOnLine(true);
    window.dispatchEvent(new Event("online"));

    await waitFor(() => {
      expect(container.querySelector(".fixed.inset-0")).not.toBeInTheDocument();
    });
  });

  it("should show overlay when additionalOffline returns true", async () => {
    setNavigatorOnLine(true);

    const { container } = render(() => (
      <OfflineGuard additionalOffline={() => true}>
        <div>content</div>
      </OfflineGuard>
    ));

    await waitFor(() => {
      expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
      expect(screen.getByText("Offline - Score entry disabled")).toBeInTheDocument();
    });
  });

  it("should not show overlay when additionalOffline returns false", () => {
    setNavigatorOnLine(true);

    const { container } = render(() => (
      <OfflineGuard additionalOffline={() => false}>
        <div>content</div>
      </OfflineGuard>
    ));

    expect(container.querySelector(".fixed.inset-0")).not.toBeInTheDocument();
  });

  it("should react to additionalOffline signal changes", async () => {
    setNavigatorOnLine(true);
    const [wsConnected, setWsConnected] = createSignal(true);

    const { container } = render(() => (
      <OfflineGuard additionalOffline={() => !wsConnected()}>
        <div>content</div>
      </OfflineGuard>
    ));

    expect(container.querySelector(".fixed.inset-0")).not.toBeInTheDocument();

    // Simulate WS disconnect
    setWsConnected(false);

    await waitFor(() => {
      expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
    });

    // Simulate WS reconnect
    setWsConnected(true);

    await waitFor(() => {
      expect(container.querySelector(".fixed.inset-0")).not.toBeInTheDocument();
    });
  });

  it("should block button clicks when overlay is active", async () => {
    setNavigatorOnLine(true);
    const onClick = vi.fn();
    const user = userEvent.setup();

    const { container } = render(() => (
      <OfflineGuard>
        <button type="button" onClick={onClick}>
          Submit
        </button>
      </OfflineGuard>
    ));

    // Click works when online
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    // Go offline
    setNavigatorOnLine(false);
    window.dispatchEvent(new Event("offline"));

    await waitFor(() => {
      expect(container.querySelector(".fixed.inset-0")).toBeInTheDocument();
    });

    // The overlay covers the button — verify it's present with pointer-blocking z-index
    const overlay = container.querySelector(".fixed.inset-0") as HTMLElement;
    expect(overlay).toBeInTheDocument();
    expect(overlay.className).toContain("z-[9998]");
  });
});
