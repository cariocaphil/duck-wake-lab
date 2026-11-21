import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchDuckExplain,
  type DuckExplainRequest,
  WakeApiError,
} from "../api/wakeClient";
import type { DuckSpecies } from "../duckSpecies";
import type { WakeControlValues } from "../types";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  /** Complete message text (never a partially revealed string). */
  content: string;
}

export type DuckChatStatus = "idle" | "loading" | "error";

export interface DuckChatSimulationContext {
  species: DuckSpecies;
  values: WakeControlValues;
}

export interface UseDuckChatResult {
  isOpen: boolean;
  messages: ChatMessage[];
  status: DuckChatStatus;
  error: string | null;
  /** True while an explain request is in flight (Send must stay disabled). */
  isPending: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  send: (question: string) => void;
  retry: () => void;
}

const MAX_HISTORY_TURNS = 10;

let messageIdCounter = 0;

function nextMessageId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

function toApiHistory(
  messages: ChatMessage[],
): NonNullable<DuckExplainRequest["history"]> {
  return messages.slice(-MAX_HISTORY_TURNS).map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function buildRequest(
  question: string,
  priorMessages: ChatMessage[],
  context: DuckChatSimulationContext,
): DuckExplainRequest {
  return {
    question,
    context: {
      species: context.species,
      duck_length_m: context.values.duckLengthM,
      swimming_speed_m_s: context.values.speedMS,
      physics_mode: context.values.physicsMode,
    },
    history: toApiHistory(priorMessages),
  };
}

/**
 * Conversation state for the floating Speaking Duck chatbot.
 * Canonical messages always store complete answers; presentation reveal is separate.
 */
export function useDuckChat(
  simulation: DuckChatSimulationContext,
): UseDuckChatResult {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<DuckChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(
    null,
  );

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const messagesRef = useRef(messages);
  const simulationRef = useRef(simulation);
  const statusRef = useRef(status);

  messagesRef.current = messages;
  simulationRef.current = simulation;
  statusRef.current = status;

  const isPending = status === "loading";

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Shared explain starter. Callers pass prior history and the user turn
   * explicitly so retry can reuse a failed turn without racing React state.
   */
  const startExplain = useCallback(
    (
      question: string,
      priorMessages: ChatMessage[],
      userMessage: ChatMessage,
    ) => {
      if (statusRef.current === "loading") {
        return;
      }

      setLastFailedQuestion(question);
      setError(null);
      setStatus("loading");

      const withUser = [...priorMessages, userMessage];
      messagesRef.current = withUser;
      setMessages(withUser);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      const body = buildRequest(question, priorMessages, simulationRef.current);

      void (async () => {
        try {
          const response = await fetchDuckExplain(body, controller.signal);
          if (controller.signal.aborted || requestId !== requestIdRef.current) {
            return;
          }
          const assistantMessage: ChatMessage = {
            id: nextMessageId(),
            role: "assistant",
            content: response.answer,
          };
          setMessages((prev) => {
            const next = [...prev, assistantMessage];
            messagesRef.current = next;
            return next;
          });
          setStatus("idle");
          setError(null);
          setLastFailedQuestion(null);
        } catch (err) {
          if (controller.signal.aborted || requestId !== requestIdRef.current) {
            return;
          }
          const message =
            err instanceof WakeApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "The speaking duck could not answer.";
          setStatus("error");
          setError(message);
        } finally {
          if (abortRef.current === controller) {
            abortRef.current = null;
          }
        }
      })();
    },
    [],
  );

  const send = useCallback(
    (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || statusRef.current === "loading") {
        return;
      }

      const prior = messagesRef.current;
      const userMessage: ChatMessage = {
        id: nextMessageId(),
        role: "user",
        content: question,
      };
      startExplain(question, prior, userMessage);
    },
    [startExplain],
  );

  const retry = useCallback(() => {
    if (statusRef.current === "loading" || !lastFailedQuestion) {
      return;
    }

    const question = lastFailedQuestion;
    const current = messagesRef.current;
    const last = current[current.length - 1];

    let priorMessages: ChatMessage[];
    let userMessage: ChatMessage;

    if (last?.role === "user" && last.content === question) {
      // Reuse the failed turn; do not remove and re-append it.
      priorMessages = current.slice(0, -1);
      userMessage = last;
    } else {
      priorMessages = current;
      userMessage = {
        id: nextMessageId(),
        role: "user",
        content: question,
      };
    }

    startExplain(question, priorMessages, userMessage);
  }, [lastFailedQuestion, startExplain]);

  return {
    isOpen,
    messages,
    status,
    error,
    isPending,
    toggle,
    open,
    close,
    send,
    retry,
  };
}
