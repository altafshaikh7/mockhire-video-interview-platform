
import { useEffect, useMemo, useRef, useState } from "react";

const MAX_CHAT = 1000;
const MAX_CODE = 50_000;

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "plaintext", label: "Plain text" },
];

function Icon({ name, className = "h-4 w-4" }) {
  const paths = {
    close: <path d="M6 6l12 12M18 6L6 18" />,
    send: <path d="M4 12h16m-6-6 6 6-6 6" />,
    chat: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
      </>
    ),
    code: (
      <>
        <path d="m8 17-5-5 5-5M16 7l5 5-5 5M14 4l-4 16" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function SideTab({ active, onClick, children, icon, badge }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--neu-accent)]",
        active
          ? "bg-[var(--neu-bg)] text-[var(--neu-accent)] shadow-[inset_3px_3px_6px_var(--neu-shadow),inset_-3px_-3px_6px_var(--neu-light)]"
          : "text-[var(--neu-muted)] hover:text-[var(--neu-text)]",
      ].join(" ")}
    >
      <Icon name={icon} />
      {children}

      {badge > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--neu-accent)] px-1 text-[10px] font-bold text-white shadow-sm">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export default function SidePanel({
  panel,
  onSwitch,
  onClose,
  unread,
  messages,
  selfId,
  onSend,
  code,
  language,
  onCode,
  onLanguage,
}) {
  return (
    <aside
      data-sidepanel
      aria-label={panel === "chat" ? "Chat" : "Code pad"}
      className="relative flex h-full w-full flex-col overflow-hidden border-l border-white/60 bg-[var(--neu-bg)] text-[var(--neu-text)] shadow-[-6px_0_18px_rgba(117,112,140,0.08)]"
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--neu-shadow)]/50 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--neu-bg)] text-[var(--neu-accent)] shadow-[4px_4px_8px_var(--neu-shadow),-4px_-4px_8px_var(--neu-light)] sm:grid">
            <Icon name={panel === "chat" ? "chat" : "code"} />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold sm:text-base">
              {panel === "chat" ? "Room chat" : "Shared code"}
            </h2>
            <p className="text-[11px] text-[var(--neu-muted)]">
              {panel === "chat"
                ? "Messages for this interview"
                : "Collaborate in real time"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--neu-muted)] transition-all hover:text-[var(--neu-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--neu-accent)]"
          style={{
            boxShadow:
              "4px 4px 8px var(--neu-shadow), -4px -4px 8px var(--neu-light)",
          }}
        >
          <Icon name="close" />
        </button>
      </header>

      <div
        role="tablist"
        aria-label="Interview panel"
        className="mx-3 mt-3 flex gap-1 rounded-2xl bg-[var(--neu-bg)] p-1.5 shadow-[inset_3px_3px_6px_var(--neu-shadow),inset_-3px_-3px_6px_var(--neu-light)] sm:mx-4"
      >
        <SideTab
          active={panel === "chat"}
          onClick={() => panel !== "chat" && onSwitch("chat")}
          icon="chat"
          badge={panel !== "chat" ? unread : 0}
        >
          Chat
        </SideTab>

        <SideTab
          active={panel === "code"}
          onClick={() => panel !== "code" && onSwitch("code")}
          icon="code"
        >
          Code pad
        </SideTab>
      </div>

      {panel === "chat" ? (
        <Chat messages={messages} selfId={selfId} onSend={onSend} />
      ) : (
        <CodePad
          code={code}
          language={language}
          onCode={onCode}
          onLanguage={onLanguage}
        />
      )}
    </aside>
  );
}

// ── Chat ─────────────────────────────────────────────────────────────

function Chat({ messages, selfId, onSend }) {
  const [draft, setDraft] = useState("");
  const [unseen, setUnseen] = useState(false);

  const listRef = useRef(null);
  const stickRef = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    if (stickRef.current) {
      el.scrollTop = el.scrollHeight;
      setUnseen(false);
    } else {
      setUnseen(true);
    }
  }, [messages]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;

    stickRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;

    if (stickRef.current) setUnseen(false);
  }

  function send(e) {
    e.preventDefault();

    const text = draft.trim();
    if (!text) return;

    onSend(text.slice(0, MAX_CHAT));
    setDraft("");
    stickRef.current = true;
  }

  return (
    <>
      <div
        ref={listRef}
        onScroll={onScroll}
        className="relative flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {messages.length === 0 && (
          <div className="mx-auto mt-8 max-w-[240px] text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--neu-bg)] text-[var(--neu-accent)] shadow-[5px_5px_10px_var(--neu-shadow),-5px_-5px_10px_var(--neu-light)]">
              <Icon name="chat" className="h-5 w-5" />
            </div>

            <p className="text-sm font-semibold text-[var(--neu-text)]">
              Start the conversation
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--neu-muted)]">
              Messages stay in the room. Nothing here is stored.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const mine = m.from.id === selfId;

          return (
            <div
              key={i}
              className={mine ? "flex justify-end" : "flex justify-start"}
            >
              <div className={`max-w-[88%] ${mine ? "text-right" : ""}`}>
                <p className="mb-1 px-1 text-[11px] font-semibold text-[var(--neu-muted)]">
                  {mine ? "You" : m.from.name}
                </p>

                <p
                  className={[
                    "inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed",
                    mine
                      ? "rounded-br-md bg-[var(--neu-accent)] text-white shadow-[3px_4px_8px_rgba(117,112,140,0.22)]"
                      : "rounded-bl-md border border-white/70 bg-[var(--neu-bg)] text-[var(--neu-text)] shadow-[4px_4px_9px_var(--neu-shadow),-4px_-4px_9px_var(--neu-light)]",
                  ].join(" ")}
                >
                  {m.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {unseen && (
        <button
          type="button"
          onClick={() => {
            stickRef.current = true;
            if (listRef.current) {
              listRef.current.scrollTop = listRef.current.scrollHeight;
            }
            setUnseen(false);
          }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-[var(--neu-accent)] px-4 py-2 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]"
        >
          New messages
        </button>
      )}

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-[var(--neu-shadow)]/50 p-3 sm:p-4"
      >
        <div className="min-w-0 flex-1 rounded-2xl bg-[var(--neu-bg)] p-1 shadow-[inset_4px_4px_8px_var(--neu-shadow),inset_-4px_-4px_8px_var(--neu-light)]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHAT))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                send(e);
              }
            }}
            rows={1}
            maxLength={MAX_CHAT}
            placeholder="Write a message..."
            aria-label="Chat message"
            className="max-h-28 min-h-[42px] w-full resize-none bg-transparent px-3 py-2.5 text-sm text-[var(--neu-text)] outline-none placeholder:text-[var(--neu-muted)]"
          />
          <div className="px-3 pb-1 text-right text-[10px] text-[var(--neu-muted)]">
            {draft.length}/{MAX_CHAT}
          </div>
        </div>

        <button
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--neu-accent)] text-white shadow-[4px_4px_9px_var(--neu-shadow),-4px_-4px_9px_var(--neu-light)] transition-all hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--neu-accent)]"
        >
          <Icon name="send" className="h-4 w-4" />
        </button>
      </form>
    </>
  );
}

// ── Code pad ─────────────────────────────────────────────────────────

function CodePad({ code, language, onCode, onLanguage }) {
  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const railRef = useRef(null);
  const areaRef = useRef(null);

  function syncScroll() {
    if (railRef.current && areaRef.current) {
      railRef.current.scrollTop = areaRef.current.scrollTop;
    }
  }

  function onKeyDown(e) {
    if (e.key !== "Tab") return;

    e.preventDefault();

    const el = e.target;
    const { selectionStart: start, selectionEnd: end } = el;
    const next = code.slice(0, start) + "  " + code.slice(end);

    if (next.length > MAX_CODE) return;

    onCode(next);

    requestAnimationFrame(() => {
      el.setSelectionRange(start + 2, start + 2);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--neu-shadow)]/50 px-3 py-3 sm:px-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--neu-muted)]">
          Language

          <select
            value={language}
            onChange={(e) => onLanguage(e.target.value)}
            className="max-w-[150px] rounded-xl border border-white/70 bg-[var(--neu-bg)] px-2.5 py-2 text-xs font-semibold text-[var(--neu-text)] shadow-[3px_3px_6px_var(--neu-shadow),-3px_-3px_6px_var(--neu-light)] outline-none focus:ring-2 focus:ring-[var(--neu-accent)]/40"
          >
            {LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <span className="rounded-lg bg-[var(--neu-bg)] px-2.5 py-1.5 text-[10px] font-medium tabular-nums text-[var(--neu-muted)] shadow-[inset_2px_2px_4px_var(--neu-shadow),inset_-2px_-2px_4px_var(--neu-light)]">
          {code.length.toLocaleString()} / {MAX_CODE.toLocaleString()} chars
        </span>
      </div>

      <div className="flex min-h-0 flex-1 font-mono text-[13px] leading-[1.7]">
        <div
          ref={railRef}
          aria-hidden="true"
          className="w-10 shrink-0 select-none overflow-hidden border-r border-[var(--neu-shadow)]/40 py-3 pr-2 text-right text-[var(--neu-muted)]/70 sm:w-12"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          ref={areaRef}
          value={code}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CODE) {
              onCode(e.target.value);
            }
          }}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Shared code pad"
          placeholder="Write code together. Both of you see every keystroke."
          className="min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-[var(--neu-text)] outline-none placeholder:text-[var(--neu-muted)]/80 focus:bg-white/10"
        />
      </div>

      <div className="border-t border-[var(--neu-shadow)]/40 px-4 py-2 text-[10px] text-[var(--neu-muted)]">
        Shared text pad · Tab inserts 2 spaces · No code execution
      </div>
    </div>
  );
}
