import { useCallback, useRef } from "react";
import { useDuckChat } from "../../hooks/useDuckChat";
import type { DuckSpecies } from "../../duckSpecies";
import type { WakeControlValues } from "../../types";
import { DuckAvatar } from "./DuckAvatar";
import { DuckChatWindow } from "./DuckChatWindow";

interface DuckChatLauncherProps {
  species: DuckSpecies;
  values: WakeControlValues;
}

/**
 * Floating Speaking Duck: launcher button + optional chat window.
 * Conversation history is preserved while the window is closed.
 * Progressive reveal / beak speaking live only in the open window.
 * Revealed assistant message IDs persist across close/reopen.
 */
export function DuckChatLauncher({ species, values }: DuckChatLauncherProps) {
  const chat = useDuckChat({ species, values });
  const revealedIdsRef = useRef(new Set<string>());

  const isAssistantRevealed = useCallback((messageId: string) => {
    return revealedIdsRef.current.has(messageId);
  }, []);

  const onAssistantRevealed = useCallback((messageId: string) => {
    revealedIdsRef.current.add(messageId);
  }, []);

  const launcherState =
    chat.isOpen && chat.status === "loading" ? "thinking" : "idle";

  return (
    <div className="duck-chat-root" data-testid="duck-chat-root">
      {chat.isOpen ? (
        <DuckChatWindow
          messages={chat.messages}
          status={chat.status}
          error={chat.error}
          isPending={chat.isPending}
          onClose={chat.close}
          onSend={chat.send}
          onRetry={chat.retry}
          isAssistantRevealed={isAssistantRevealed}
          onAssistantRevealed={onAssistantRevealed}
        />
      ) : null}

      <button
        type="button"
        className="duck-chat-launcher"
        aria-expanded={chat.isOpen}
        aria-label={
          chat.isOpen ? "Close speaking duck chat" : "Open speaking duck chat"
        }
        data-testid="duck-chat-launcher"
        onClick={chat.toggle}
      >
        <DuckAvatar state={launcherState} size={56} />
      </button>
    </div>
  );
}
