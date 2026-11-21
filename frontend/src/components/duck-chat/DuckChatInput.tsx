import { useState, type FormEvent, type KeyboardEvent } from "react";

interface DuckChatInputProps {
  disabled: boolean;
  onSend: (question: string) => void;
}

export function DuckChatInput({ disabled, onSend }: DuckChatInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }
    onSend(trimmed);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form className="duck-chat-input" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor="duck-chat-question">
        Ask the duck a physics question
      </label>
      <textarea
        id="duck-chat-question"
        className="duck-chat-input__field"
        rows={2}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask about wakes, Froude number, waves…"
        maxLength={500}
      />
      <button
        type="submit"
        className="duck-chat-input__send"
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </form>
  );
}
