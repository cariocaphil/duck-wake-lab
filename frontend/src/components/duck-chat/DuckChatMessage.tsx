import type { ChatMessage } from "../../hooks/useDuckChat";

interface DuckChatMessageProps {
  message: ChatMessage;
  /** When set, overrides displayed text for presentation-only reveal. */
  displayedContent?: string;
}

export function DuckChatMessage({
  message,
  displayedContent,
}: DuckChatMessageProps) {
  const text = displayedContent ?? message.content;
  const isUser = message.role === "user";
  const revealing =
    !isUser &&
    displayedContent !== undefined &&
    displayedContent !== message.content;

  return (
    <div
      className={`duck-chat-message duck-chat-message--${message.role}`}
      data-testid={`duck-chat-message-${message.role}`}
    >
      <p className="duck-chat-bubble">
        <span className="duck-chat-bubble__label">
          {isUser ? "You" : "Duck"}
        </span>
        <span className="duck-chat-bubble__text" aria-hidden={revealing}>
          {text}
        </span>
      </p>
      {/* Full answer stays in the DOM for AT; progressive text is presentation-only. */}
      {!isUser && revealing ? (
        <span className="visually-hidden">{message.content}</span>
      ) : null}
    </div>
  );
}
