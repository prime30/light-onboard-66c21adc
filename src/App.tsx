import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Outlet, RouteObject } from "react-router";
import { GlobalAppProvider } from "./contexts/GlobalAppProvider";
import { UploadFileProvider } from "./contexts";
import { RegistrationLayout } from "./components/registration/RegistrationLayout";

// Lazy-load route components to reduce initial bundle
const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Reviews = lazy(() => import("./pages/Reviews"));
const BlogResaleLicense = lazy(() => import("./pages/BlogResaleLicense"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const AlreadyLoggedInPage = lazy(() => import("./pages/AlreadyLoggedInPage"));

const queryClient = new QueryClient();

const App = () => (
  <GlobalAppProvider>
    <QueryClientProvider client={queryClient}>
      <UploadFileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense>
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
        Component: AuthPage,
      },
      {
        path: "login",
        Component: LoginPage,
      },
      {
        path: "already-logged-in",
        Component: AlreadyLoggedInPage,
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
