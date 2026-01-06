import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Outlet, RouteObject } from "react-router";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Reviews from "./pages/Reviews";
import BlogResaleLicense from "./pages/BlogResaleLicense";
import NotFound from "./pages/NotFound";
import { GlobalAppProvider } from "./contexts/GlobalAppProvider";
import { UploadFileProvider } from "./contexts";
import { RegistrationLayout } from "./components/registration/RegistrationLayout";
import { LoginPage } from "./pages/LoginPage";

const queryClient = new QueryClient();

const App = () => (
  <GlobalAppProvider>
    <QueryClientProvider client={queryClient}>
      <UploadFileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Outlet />
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
