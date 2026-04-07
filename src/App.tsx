import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Outlet, RouteObject } from "react-router";
import { GlobalAppProvider } from "./contexts/GlobalAppProvider";
import { UploadFileProvider } from "./contexts";
import { RegistrationLayout } from "./components/registration/RegistrationLayout";
import { AuthBootFallback, GenericBootFallback } from "./components/registration/AuthBootFallback";
import AuthPage from "./pages/AuthPage";

// Lazy-load non-initial routes
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const AlreadyLoggedInPage = lazy(() => import("./pages/AlreadyLoggedInPage"));

// Lazy-load route components to reduce initial bundle
const Index = lazy(() => import("./pages/Index"));
const Reviews = lazy(() => import("./pages/Reviews"));
const BlogResaleLicense = lazy(() => import("./pages/BlogResaleLicense"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <GlobalAppProvider>
    <QueryClientProvider client={queryClient}>
      <UploadFileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<GenericBootFallback />}>
            <Outlet />
          </Suspense>
        </TooltipProvider>
      </UploadFileProvider>
    </QueryClientProvider>
  </GlobalAppProvider>
);

const children: RouteObject[] = [
  {
    index: true,
    Component: Index,
  },
  {
    Component: RegistrationLayout,
    children: [
      {
        path: "auth",
        element: (
          <Suspense fallback={<AuthBootFallback />}>
            <AuthPage />
          </Suspense>
        ),
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
    ],
  },
  {
    path: "reviews",
    Component: Reviews,
  },
  {
    path: "blog/resale-license",
    Component: BlogResaleLicense,
  },
  {
    path: "*",
    Component: NotFound,
  },
];

export const router = createBrowserRouter([
  {
    Component: App,
    children,
  },
]);

export default App;
