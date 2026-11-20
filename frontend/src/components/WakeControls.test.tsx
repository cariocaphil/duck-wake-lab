import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WakeControls } from "./WakeControls";
import { DEFAULT_CONTROLS } from "../types";

describe("WakeControls", () => {
  it("displays initial duck length and swimming speed", () => {
    render(
      <WakeControls values={DEFAULT_CONTROLS} onChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("Duck length")).toHaveValue("0.5");
    expect(screen.getByLabelText("Swimming speed")).toHaveValue("1.2");
    expect(screen.getByText("Duck length (0.50 m)")).toBeInTheDocument();
    expect(screen.getByText("Swimming speed (1.20 m/s)")).toBeInTheDocument();
  });

  it("notifies onChange when a slider moves", () => {
    const onChange = vi.fn();
    render(<WakeControls values={DEFAULT_CONTROLS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Swimming speed"), {
      target: { value: "2.0" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_CONTROLS,
      speedMS: 2.0,
    });
  });
});
