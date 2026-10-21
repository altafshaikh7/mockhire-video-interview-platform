import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Logo, Spinner } from "./components/ui";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InterviewRoom = lazy(() => import("./pages/InterviewRoom"));

function AuthLoading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-[var(--neu-bg)] px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5">
        <Logo />
        <Spinner />
        <span className="text-sm text-ink-500">Checking your session…</span>
      </div>
    </main>
  );
}

// Route guards show a lightweight shell while the session is checked.
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  return user ? children : <Navigate to="/login" replace />;
}

// Inverse guard: logged-in users skip the marketing/auth pages.
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

console.log(`[${new Date().toISOString()}] [client-sys] [main] [init] REACT_APP_MOUNT`, { perfNow: performance.now() });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="grid min-h-screen place-items-center bg-[var(--neu-bg)]">
              <Spinner />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/room/:roomCode" element={<Protected><InterviewRoom /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
