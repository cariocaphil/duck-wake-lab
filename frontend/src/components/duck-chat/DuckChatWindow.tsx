import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { ChatMessage, DuckChatStatus } from "../../hooks/useDuckChat";
import { DuckAvatar, type DuckAvatarState } from "./DuckAvatar";
import { DuckChatInput } from "./DuckChatInput";
import { DuckChatMessage } from "./DuckChatMessage";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useProgressiveReveal } from "./useProgressiveReveal";

export const SUGGESTED_QUESTIONS = [
  "Why does the wake form a V?",
  "What is the Kelvin angle?",
  "What happens when I swim faster?",
  "What is the Froude number?",
] as const;

interface DuckChatWindowProps {
  messages: ChatMessage[];
  status: DuckChatStatus;
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onSend: (question: string) => void;
  onRetry: () => void;
}

function resolveAvatarState(
  status: DuckChatStatus,
  isRevealing: boolean,
): DuckAvatarState {
  if (status === "loading") {
    return "thinking";
  }
  if (isRevealing) {
    return "speaking";
  }
  return "idle";
}

export function DuckChatWindow({
  messages,
  status,
  error,
  isPending,
  onClose,
  onSend,
  onRetry,
}: DuckChatWindowProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const reducedMotion = usePrefersReducedMotion();
  const [announcement, setAnnouncement] = useState("");
  const announcedIdRef = useRef<string | null>(null);

  const latestAssistant =
    [...messages].reverse().find((m) => m.role === "assistant") ?? null;
  const revealActive =
    Boolean(latestAssistant) && status !== "loading" && status !== "error";

  const { displayed, isRevealing } = useProgressiveReveal({
    text: latestAssistant?.content ?? "",
    active: revealActive,
    reducedMotion,
  });

  useEffect(() => {
    if (!latestAssistant || latestAssistant.id === announcedIdRef.current) {
      return;
    }
    announcedIdRef.current = latestAssistant.id;
    setAnnouncement(latestAssistant.content);
  }, [latestAssistant]);

  useEffect(() => {
    const node = panelRef.current;
    if (!node) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const closeButton = node.querySelector<HTMLElement>(
      "[data-duck-chat-close]",
    );
    closeButton?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (!log || !stickToBottomRef.current) {
      return;
    }
    log.scrollTop = log.scrollHeight;
  }, [messages, displayed, status, error]);

  function handleLogScroll() {
    const log = logRef.current;
    if (!log) {
      return;
    }
    const distanceFromBottom =
      log.scrollHeight - log.scrollTop - log.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  const avatarState = resolveAvatarState(status, isRevealing);
  const showSuggestions = messages.length === 0 && !isPending;

  return (
    <div
      ref={panelRef}
      className="duck-chat-window"
      role="dialog"
      aria-modal="false"
      aria-labelledby="duck-chat-title"
      data-testid="duck-chat-window"
      onKeyDown={handleKeyDown}
    >
      <header className="duck-chat-window__header">
        <DuckAvatar state={avatarState} size={56} />
        <h2 id="duck-chat-title" className="duck-chat-window__title">
          Ask the Duck
        </h2>
        <button
          type="button"
          className="duck-chat-window__close"
          data-duck-chat-close
          aria-label="Close speaking duck chat"
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <div
        className="visually-hidden"
        aria-live="polite"
        aria-atomic="true"
        data-testid="duck-chat-announcer"
      >
        {announcement}
      </div>

      <div
        ref={logRef}
        className="duck-chat-window__log"
        role="log"
        aria-relevant="additions"
        onScroll={handleLogScroll}
      >
        {showSuggestions ? (
          <div className="duck-chat-suggestions">
            <p className="duck-chat-suggestions__label">Try asking:</p>
            <ul className="duck-chat-suggestions__list">
              {SUGGESTED_QUESTIONS.map((question) => (
                <li key={question}>
                  <button
                    type="button"
                    className="duck-chat-suggestions__button"
                    disabled={isPending}
                    onClick={() => onSend(question)}
                  >
                    {question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {messages.map((message) => {
          const isLatestAssistant =
            latestAssistant !== null && message.id === latestAssistant.id;
          return (
            <DuckChatMessage
              key={message.id}
              message={message}
              displayedContent={
                isLatestAssistant && revealActive ? displayed : undefined
              }
            />
          );
        })}

        {status === "loading" ? (
          <p className="duck-chat-status" data-testid="duck-chat-loading">
            The duck is thinking…
          </p>
        ) : null}

        {status === "error" && error ? (
          <div className="duck-chat-error" data-testid="duck-chat-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRetry} disabled={isPending}>
              Retry
            </button>
          </div>
        ) : null}
      </div>

      <DuckChatInput disabled={isPending} onSend={onSend} />
    </div>
  );
}
