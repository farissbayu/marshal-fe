import { createRouter } from "@tanstack/react-router";
import { LoadingDetail } from "@/components/common/LoadingState";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => (
    <div className="p-6">
      <LoadingDetail />
    </div>
  ),
  defaultPendingMs: 250,
  defaultPendingMinMs: 200,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
