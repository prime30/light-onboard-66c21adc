import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, Outlet, RouteObject } from "react-router";
import { GlobalAppProvider } from "./contexts/GlobalAppProvider";
import { UploadFileProvider } from "./contexts";
import { RegistrationLayout } from "./components/registration/RegistrationLayout";
import { AuthBootFallback, GenericBootFallback } from "./components/registration/AuthBootFallback";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { IframeNavigationBridge } from "./components/IframeNavigationBridge";
import AuthPage from "./pages/AuthPage";
import { useStandaloneSession } from "./hooks/use-standalone-session";

// Lazy-load non-initial routes
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const AlreadyLoggedInPage = lazy(() => import("./pages/AlreadyLoggedInPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ActivateAccountPage = lazy(() => import("./pages/ActivateAccountPage"));
const NotEligiblePage = lazy(() => import("./pages/NotEligiblePage"));

// Lazy-load route components to reduce initial bundle
const Index = lazy(() => import("./pages/Index"));
const Reviews = lazy(() => import("./pages/Reviews"));
const BlogResaleLicense = lazy(() => import("./pages/BlogResaleLicense"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SsoPreviewPage = lazy(() => import("./pages/SsoPreviewPage"));
const AdminSettingsPage = lazy(() => import("./pages/AdminSettingsPage"));

const queryClient = new QueryClient();

// Hydrates customerAtom from localStorage on boot (standalone mode only).
// Iframe mode is owned by the parent theme via CUSTOMER_DATA postMessage.
const StandaloneSessionBoot = () => {
  useStandaloneSession();
  return null;
};

const App = () => (
  <GlobalAppProvider>
    <QueryClientProvider client={queryClient}>
      <UploadFileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <StandaloneSessionBoot />
          <AppErrorBoundary>
            <Outlet />
          </AppErrorBoundary>
        </TooltipProvider>
      </UploadFileProvider>
    </QueryClientProvider>
  </GlobalAppProvider>
);

// Gate the dev-only landing page behind ?dev=1 so customers embedded in
// the Shopify iframe never see it. Default "/" sends them straight to /auth.
const IndexRoute = () => {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("dev")) {
    return (
      <Suspense fallback={<GenericBootFallback />}>
        <Index />
      </Suspense>
    );
  }
  return <Navigate to="/auth" replace />;
};

const children: RouteObject[] = [
  {
    index: true,
    element: <IndexRoute />,
  },
  {
    Component: RegistrationLayout,
    children: [
      {
        path: "auth",
        element: <AuthPage />,
      },
      {
        path: "login",
        element: (
          <Suspense fallback={<AuthBootFallback />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: "already-logged-in",
        element: (
          <Suspense fallback={<AuthBootFallback />}>
            <AlreadyLoggedInPage />
          </Suspense>
        ),
      },
      {
        path: "reset-password",
        element: (
          <Suspense fallback={<AuthBootFallback />}>
            <ResetPasswordPage />
          </Suspense>
        ),
      },
      {
        path: "activate-account",
        element: (
          <Suspense fallback={<AuthBootFallback />}>
            <ActivateAccountPage />
          </Suspense>
        ),
      },
      {
        path: "not-eligible",
        element: (
          <Suspense fallback={<AuthBootFallback />}>
            <NotEligiblePage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "reviews",
    element: (
      <Suspense fallback={<GenericBootFallback />}>
        <Reviews />
      </Suspense>
    ),
  },
  {
    path: "blog/resale-license",
    element: (
      <Suspense fallback={<GenericBootFallback />}>
        <BlogResaleLicense />
      </Suspense>
    ),
  },
  {
    path: "sso-preview",
    element: (
      <Suspense fallback={<GenericBootFallback />}>
        <SsoPreviewPage />
      </Suspense>
    ),
  },
  {
    path: "admin/settings",
    element: (
      <Suspense fallback={<GenericBootFallback />}>
        <AdminSettingsPage />
      </Suspense>
    ),
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<GenericBootFallback />}>
        <NotFound />
      </Suspense>
    ),
  },
];

import { getRouterBasename } from "./lib/router-basename";

export const router = createBrowserRouter(
  [
    {
      Component: App,
      children,
    },
  ],
  { basename: getRouterBasename() }
);

export default App;
