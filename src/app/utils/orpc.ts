import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createORPCSolidQueryUtils } from "@orpc/solid-query";
import type { appRouter } from "../../api/orpc/router.js";

const link = new RPCLink({
  url: `${window.location.origin}/rpc`,
  fetch: (request, init) => globalThis.fetch(request, { ...init, credentials: "include" }),
});

const client: RouterClient<typeof appRouter> = createORPCClient(link);
export const orpc = createORPCSolidQueryUtils(client);
