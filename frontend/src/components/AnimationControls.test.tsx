import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnimationControls } from "./AnimationControls";

function renderControls(
  overrides: Partial<Parameters<typeof AnimationControls>[0]> = {},
) {
  const props = {
    playing: true,
    speed: 1 as const,
    reducedMotion: false,
    swimmingSpeedMS: 1.2,
    onTogglePlaying: vi.fn(),
    onSpeedChange: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  render(<AnimationControls {...props} />);
  return props;
}

describe("AnimationControls", () => {
  it("labels the play/pause button for its next action", () => {
    const { rerender } = render(
      <AnimationControls
        playing={true}
        speed={1}
        reducedMotion={false}
        swimmingSpeedMS={1.2}
        onTogglePlaying={vi.fn()}
        onSpeedChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Pause animation" }),
    ).toBeInTheDocument();

    rerender(
      <AnimationControls
        playing={false}
        speed={1}
        reducedMotion={false}
        swimmingSpeedMS={1.2}
        onTogglePlaying={vi.fn()}
        onSpeedChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Play animation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset animation" })).toBeInTheDocument();
  });

  it("offers 0.5x, 1x and 2x with the current one checked", () => {
    renderControls({ speed: 2 });
    const group = screen.getByRole("group", { name: "Animation speed (×)" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => radio.parentElement?.textContent)).toEqual([
      "0.5×",
      "1×",
      "2×",
    ]);
    expect(screen.getByRole("radio", { name: "2×" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "1×" })).not.toBeChecked();
  });

  it("calls back for toggle, reset and speed changes", () => {
    const props = renderControls();
    fireEvent.click(screen.getByRole("button", { name: "Pause animation" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset animation" }));
    fireEvent.click(screen.getByRole("radio", { name: "0.5×" }));
    expect(props.onTogglePlaying).toHaveBeenCalledTimes(1);
    expect(props.onReset).toHaveBeenCalledTimes(1);
    expect(props.onSpeedChange).toHaveBeenCalledWith(0.5);
  });

  it("works from the keyboard (Tab, Enter, Space, arrow keys)", async () => {
    const user = userEvent.setup();
    const props = renderControls();

    await user.tab();
    expect(screen.getByRole("button", { name: "Pause animation" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(props.onTogglePlaying).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(screen.getByRole("button", { name: "Reset animation" })).toHaveFocus();
    await user.keyboard(" ");
    expect(props.onReset).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(screen.getByRole("radio", { name: "1×" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(props.onSpeedChange).toHaveBeenCalledWith(2);
  });

  it("distinguishes animation speed (x) from swimming speed (m/s)", () => {
    renderControls({ swimmingSpeedMS: 1.2 });
    const hint = screen.getByTestId("animation-hint");
    expect(hint).toHaveTextContent(/only changes playback/i);
    expect(hint).toHaveTextContent("1.20 m/s");
    expect(hint).toHaveTextContent(/physical parameter/i);
  });

  it("omits the speed value when there is no wave data yet", () => {
    renderControls({ swimmingSpeedMS: null });
    expect(screen.getByTestId("animation-hint")).not.toHaveTextContent("m/s)");
  });

  it("explains the paused start only when reduced motion is requested", () => {
    const { unmount } = render(
      <AnimationControls
        playing={false}
        speed={1}
        reducedMotion={true}
        swimmingSpeedMS={1}
        onTogglePlaying={vi.fn()}
        onSpeedChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByTestId("animation-reduced-motion")).toHaveTextContent(
      /reduced motion/i,
    );
    unmount();
    renderControls({ reducedMotion: false });
    expect(screen.queryByTestId("animation-reduced-motion")).not.toBeInTheDocument();
  });
});
