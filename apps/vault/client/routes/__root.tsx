import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { AppSidebar } from "~/components/app-sidebar.tsx";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <div className="flex h-screen">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
      <TanStackRouterDevtools />
    </>
  ),
});
