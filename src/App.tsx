import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Auth from "./pages/Auth";
import OptOut from "./pages/OptOut";
import Employers from "./pages/Employers";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardProfile from "./pages/dashboard/DashboardProfile";
import DashboardSavedJobs from "./pages/dashboard/DashboardSavedJobs";
import DashboardTracker from "./pages/dashboard/DashboardTracker";
import DashboardApplyKit from "./pages/dashboard/DashboardApplyKit";
import CompleteProfile from "./pages/CompleteProfile";
import { AdminRoute } from "./components/AdminRoute";
import { EmployerRoute } from "./components/EmployerRoute";
import EmployerLayout from "./layouts/EmployerLayout";
import EmployerJobs from "./pages/employer/EmployerJobs";
import EmployerLogin from "./pages/employer/EmployerLogin";
import EmployerSignup from "./pages/employer/EmployerSignup";
import EmployerPipeline from "./pages/employer/EmployerPipeline";
import EmployerSettings from "./pages/employer/EmployerSettings";
import TeamSettings from "./pages/employer/TeamSettings";
import JoinInvite from "./pages/employer/JoinInvite";
import NotificationSettings from "./pages/employer/NotificationSettings";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSources from "./pages/admin/AdminSources";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminPartnerRequests from "./pages/admin/AdminPartnerRequests";
import AdminPartnerDetail from "./pages/admin/AdminPartnerDetail";
import "./i18n";

const queryClient = new QueryClient();

/** Persistent layout: Header & Footer never unmount during navigation */
function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Routes with persistent Header + Footer */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/employers" element={<Employers />} />
                <Route path="/opt-out" element={<OptOut />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />

                {/* Employer public pages */}
                <Route path="/employer/login" element={<EmployerLogin />} />
                <Route path="/employer/signup" element={<EmployerSignup />} />
                <Route path="/employer/join" element={<JoinInvite />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />

                {/* APPLICANT DASHBOARD ROUTES */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<DashboardProfile />} />
                  <Route path="saved" element={<DashboardSavedJobs />} />
                  <Route path="tracker" element={<DashboardTracker />} />
                  <Route path="apply-kit" element={<DashboardApplyKit />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* ADMIN ROUTES — own chrome, no Header/Footer */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="companies" element={<AdminCompanies />} />
                <Route path="sources" element={<AdminSources />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="partners" element={<AdminPartners />} />
                <Route path="partners/requests" element={<AdminPartnerRequests />} />
                <Route path="partners/:id" element={<AdminPartnerDetail />} />
              </Route>

              {/* EMPLOYER ATS ROUTES — own chrome, no Header/Footer */}
              <Route path="/employer" element={<EmployerRoute><EmployerLayout /></EmployerRoute>}>
                <Route index element={<EmployerJobs />} />
                <Route path="jobs" element={<EmployerJobs />} />
                <Route path="jobs/:id/pipeline" element={<EmployerPipeline />} />
                <Route path="settings" element={<EmployerSettings />} />
                <Route path="settings/team" element={<TeamSettings />} />
                <Route path="settings/notifications" element={<NotificationSettings />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
