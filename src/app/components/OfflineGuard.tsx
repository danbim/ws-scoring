import type { ParentComponent } from "solid-js";
import { createEffect, createSignal, Show } from "solid-js";
import ConnectionStatusIndicator from "./ConnectionStatusIndicator";

interface OfflineGuardProps {
  additionalOffline?: () => boolean;
}

const OfflineGuard: ParentComponent<OfflineGuardProps> = (props) => {
  const [browserOnline, setBrowserOnline] = createSignal(navigator.onLine);

  createEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setBrowserOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  const isOffline = () => !browserOnline() || (props.additionalOffline?.() ?? false);

  return (
    <>
      {props.children}
      <Show when={isOffline()}>
        <div class="fixed inset-0 z-[9998] bg-black/70" aria-hidden="true" />
      </Show>
      <ConnectionStatusIndicator isOnline={!isOffline()} />
    </>
  );
};

export default OfflineGuard;
