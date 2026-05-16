import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import { Shell } from "@/components/Shell";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ARGO — Autonomous Logistics Risk Console" },
      {
        name: "description",
        content:
          "Production-grade MLOps console for shipment-delay prediction: predict, simulate, explain, and monitor in real time.",
      },
      { property: "og:title", content: "ARGO — Autonomous Logistics Risk Console" },
      {
        property: "og:description",
        content:
          "Predict shipment delays before dispatch, simulate interventions, and monitor model health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ARGO — Autonomous Logistics Risk Console" },
      { name: "description", content: "ShipWise AI predicts supply chain shipment delays, offering actionable insights and automated MLOps for logistics." },
      { property: "og:description", content: "ShipWise AI predicts supply chain shipment delays, offering actionable insights and automated MLOps for logistics." },
      { name: "twitter:description", content: "ShipWise AI predicts supply chain shipment delays, offering actionable insights and automated MLOps for logistics." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d8daf362-de32-4e28-a917-5cfd47dd0c0e/id-preview-9c135fe5--e18c2c34-f843-4110-935e-dcc6b32e860d.lovable.app-1778936472604.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d8daf362-de32-4e28-a917-5cfd47dd0c0e/id-preview-9c135fe5--e18c2c34-f843-4110-935e-dcc6b32e860d.lovable.app-1778936472604.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="dark">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Shell>
        <Outlet />
      </Shell>
      <Toaster theme="dark" position="top-right" richColors />
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <div className="text-6xl font-bold mono">404</div>
        <p className="text-muted-foreground mt-2">Route not found</p>
        <Link to="/" className="inline-block mt-4 text-primary underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="panel p-8 max-w-md text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mt-2 mono">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
