import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RangeField } from "./RangeField";

const baseProps = {
  label: "Body length",
  unit: "m",
  value: 0.5,
  min: 0.2,
  max: 1,
  step: 0.01,
};

describe("RangeField", () => {
  it("renders a slider labelled by the label prop", () => {
    render(<RangeField {...baseProps} onChange={vi.fn()} />);
    expect(screen.getByRole("slider", { name: "Body length" })).toBeInTheDocument();
  });

  it("displays the value with two decimals and the unit", () => {
    render(<RangeField {...baseProps} value={0.5} onChange={vi.fn()} />);
    expect(screen.getByText("Body length (0.50 m)")).toBeInTheDocument();
  });

  it("passes min, max, step and value to the input", () => {
    render(<RangeField {...baseProps} onChange={vi.fn()} />);
    const slider = screen.getByLabelText("Body length");
    expect(slider).toHaveAttribute("min", "0.2");
    expect(slider).toHaveAttribute("max", "1");
    expect(slider).toHaveAttribute("step", "0.01");
    expect(slider).toHaveValue("0.5");
  });

  it("calls onChange with the new value as a number", () => {
    const onChange = vi.fn();
    render(<RangeField {...baseProps} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Body length"), {
      target: { value: "0.8" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(0.8);
  });
});
