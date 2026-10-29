import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError, api } from "../lib/api";
import { formatWhen, isImminent, untilLabel, useTick } from "../lib/time";
import {
  Button,
  ErrorNote,
  ListSkeleton,
  Logo,
  Spinner,
  StatusBadge,
  ThemeToggle,
} from "../components/ui";

const FeedbackModal = lazy(() => import("../components/FeedbackModal"));
const ScheduleModal = lazy(() => import("../components/ScheduleModal"));

export default function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState(null);

  useTick(30000);

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listInterviews({ page: 1, limit: 50 });
      setInterviews(data.interviews);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your interviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  useEffect(() => {
    const feedbackFor = location.state?.feedbackFor;
    if (!feedbackFor || !interviews.length) return;
    const interview = interviews.find((item) => item._id === feedbackFor);
    if (interview) {
      setFeedbackInterview(interview);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [interviews, location.pathname, location.state, navigate]);

  async function cancelInterview(interview) {
    if (!window.confirm(`Cancel "${interview.title}"?`)) return;
    setBusyId(interview._id);
    setError("");
    try {
      await api.cancelInterview(interview._id);
      await loadInterviews();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel this interview.");
    } finally {
      setBusyId("");
    }
  }

  async function signOut() {
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }

  const nextInterview = interviews
    .filter((interview) => interview.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
  const orderedInterviews = [...interviews].sort(
    (a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)
  );
  const isInterviewer = user?.role === "interviewer";

  return (
    <div className="app-canvas min-h-screen text-[var(--neu-text)]">
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-ink-200/70 bg-surface/85 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden text-sm text-ink-500 sm:inline">
              {user?.name} · {isInterviewer ? "Interviewer" : "Candidate"}
            </span>
            <Button variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent-700">Your workspace</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink-950">
              {isInterviewer ? "Interviews" : "Your interview schedule"}
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              {isInterviewer
                ? "Schedule sessions and keep your candidate conversations moving."
                : "Your upcoming sessions and interview results, all in one place."}
            </p>
          </div>
          {isInterviewer && (
            <Button onClick={() => setShowSchedule(true)}>Schedule interview</Button>
          )}
        </div>

        <ErrorNote>{error}</ErrorNote>

        <section className="mt-8 min-h-[13rem] sm:min-h-[10rem]" aria-label="Upcoming interview">
          {loading ? (
            <div
              className="min-h-[13rem] rounded-3xl border border-ink-200 bg-surface p-6 shadow-[var(--shadow-card)] sm:min-h-[10rem] sm:p-8"
              aria-hidden="true"
            >
              <div className="skeleton h-3 w-16 rounded" />
              <div className="mt-5 skeleton h-7 w-2/3 rounded" />
              <div className="mt-3 skeleton h-4 w-1/2 rounded" />
              <div className="mt-2 skeleton h-4 w-2/5 rounded" />
            </div>
          ) : nextInterview ? (
            <div className="min-h-[13rem] rounded-3xl border border-night-800 bg-night-900 p-6 text-white shadow-[var(--shadow-pop)] sm:min-h-[10rem] sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-300">
                Up next
              </p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
                <div>
                  <h2 className="font-display text-2xl font-semibold">{nextInterview.title}</h2>
                  <p className="mt-2 text-sm text-white/75">
                    {isInterviewer
                      ? `With ${nextInterview.candidate?.name ?? nextInterview.candidate?.email ?? "candidate"}`
                      : `With ${nextInterview.interviewer?.name ?? "your interviewer"}`}
                  </p>
                  <p className="mt-1 text-sm text-white/75">
                    {untilLabel(nextInterview.scheduledAt)} · {formatWhen(nextInterview.scheduledAt)}
                  </p>
                </div>
                {nextInterview.roomCode ? (
                  <Button
                    variant="light"
                    onClick={() => navigate(`/room/${encodeURIComponent(nextInterview.roomCode)}`)}
                  >
                    Enter room
                  </Button>
                ) : (
                  <span className="text-sm text-white/65">Room unavailable</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[13rem] flex-col justify-center rounded-2xl bg-surface px-6 py-8 shadow-[var(--shadow-card)] sm:min-h-[10rem] sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-700">
                Up next
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold text-ink-950">
                No upcoming interviews
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Scheduled sessions will appear here.
              </p>
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink-950">All interviews</h2>
            {!loading && (
              <span className="text-sm text-ink-500">
                {interviews.length} {interviews.length === 1 ? "session" : "sessions"}
              </span>
            )}
          </div>

          {loading ? (
            <ListSkeleton rows={3} />
          ) : orderedInterviews.length ? (
            <div className="divide-y divide-ink-100 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
              {orderedInterviews.map((interview) => {
                const isUpcoming =
                  interview.status === "scheduled" && isImminent(interview.scheduledAt);
                const otherPerson = isInterviewer
                  ? interview.candidate
                  : interview.interviewer;
                const canSubmitFeedback =
                  isInterviewer && interview.status !== "cancelled";

                return (
                  <article
                    key={interview._id}
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent-50 text-sm font-semibold text-accent-700">
                      {new Date(interview.scheduledAt).getDate()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-ink-950">{interview.title}</h3>
                        <StatusBadge
                          status={interview.status === "scheduled" && isUpcoming ? "scheduled" : interview.status}
                        />
                        {interview.status === "completed" && interview.feedback?.result && (
                          <StatusBadge status={interview.feedback.result} />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-500">
                        {formatWhen(interview.scheduledAt)}
                        {otherPerson?.name ? ` · ${isInterviewer ? "Candidate" : "Interviewer"}: ${otherPerson.name}` : ""}
                      </p>
                      {interview.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-500">
                          {interview.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {interview.status === "scheduled" && interview.roomCode && (
                        <Button
                          variant={isUpcoming ? "primary" : "secondary"}
                          onClick={() => navigate(`/room/${encodeURIComponent(interview.roomCode)}`)}
                        >
                          Enter room
                        </Button>
                      )}
                      {isInterviewer && interview.status === "scheduled" && (
                        <Button
                          variant="ghost"
                          disabled={busyId === interview._id}
                          onClick={() => cancelInterview(interview)}
                        >
                          {busyId === interview._id ? <Spinner /> : "Cancel"}
                        </Button>
                      )}
                      {canSubmitFeedback && (
                        <Button
                          variant="secondary"
                          onClick={() => setFeedbackInterview(interview)}
                        >
                          {interview.status === "completed" ? "Edit feedback" : "Add feedback"}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-surface px-6 py-12 text-center shadow-[var(--shadow-card)]">
              <p className="font-medium text-ink-900">No interviews yet</p>
              <p className="mt-1 text-sm text-ink-500">
                {isInterviewer
                  ? "Schedule your first interview to get started."
                  : "When an interviewer schedules a session with you, it will appear here."}
              </p>
              {isInterviewer && (
                <Button className="mt-5" onClick={() => setShowSchedule(true)}>
                  Schedule interview
                </Button>
              )}
            </div>
          )}
        </section>
      </main>

      {showSchedule && (
        <Suspense fallback={null}>
          <ScheduleModal
            onClose={() => setShowSchedule(false)}
            onCreated={() => {
              setShowSchedule(false);
              loadInterviews();
            }}
          />
        </Suspense>
      )}
      {feedbackInterview && (
        <Suspense fallback={null}>
          <FeedbackModal
            interview={feedbackInterview}
            onClose={() => setFeedbackInterview(null)}
            onSaved={() => {
              setFeedbackInterview(null);
              loadInterviews();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
