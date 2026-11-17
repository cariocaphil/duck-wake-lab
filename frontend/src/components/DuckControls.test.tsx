import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PARAMETERS,
  PARAMETER_RANGES,
  type DuckParameters,
} from "../types";
import { DuckControls } from "./DuckControls";

function setup(parameters: DuckParameters = DEFAULT_PARAMETERS) {
  const onChange = vi.fn();
  render(<DuckControls parameters={parameters} onChange={onChange} />);
  return { onChange };
}

describe("DuckControls", () => {
  it("renders a labelled controls region with all fields", () => {
    setup();
    expect(
      screen.getByRole("region", { name: "Duck controls" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Duck species")).toBeInTheDocument();
    expect(screen.getByLabelText("Body length")).toBeInTheDocument();
    expect(screen.getByLabelText("Swimming speed")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Physics level" }),
    ).toBeInTheDocument();
  });

  it("applies PARAMETER_RANGES to the body length and speed sliders", () => {
    setup();

    const bodyLength = screen.getByLabelText("Body length");
    expect(bodyLength).toHaveAttribute(
      "min",
      String(PARAMETER_RANGES.bodyLength.min),
    );
    expect(bodyLength).toHaveAttribute(
      "max",
      String(PARAMETER_RANGES.bodyLength.max),
    );
    expect(bodyLength).toHaveAttribute(
      "step",
      String(PARAMETER_RANGES.bodyLength.step),
    );

    const speed = screen.getByLabelText("Swimming speed");
    expect(speed).toHaveAttribute("min", String(PARAMETER_RANGES.speed.min));
    expect(speed).toHaveAttribute("max", String(PARAMETER_RANGES.speed.max));
    expect(speed).toHaveAttribute("step", String(PARAMETER_RANGES.speed.step));
  });

  it("reflects the given parameters in the fields", () => {
    setup({
      species: "Teal",
      bodyLength: 0.8,
      speed: 1.25,
      physicsLevel: "kelvin",
    });
    expect(screen.getByLabelText("Duck species")).toHaveValue("Teal");
    expect(screen.getByLabelText("Body length")).toHaveValue("0.8");
    expect(screen.getByLabelText("Swimming speed")).toHaveValue("1.25");
    expect(screen.getByRole("radio", { name: "Kelvin" })).toBeChecked();
  });

  it("emits the full parameters with the species changed", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.selectOptions(screen.getByLabelText("Duck species"), "Teal");

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_PARAMETERS,
      species: "Teal",
    });
  });

  it("emits the full parameters with the body length changed", () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText("Body length"), {
      target: { value: "0.9" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_PARAMETERS,
      bodyLength: 0.9,
    });
  });

  it("emits the full parameters with the speed changed", () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText("Swimming speed"), {
      target: { value: "1.5" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_PARAMETERS,
      speed: 1.5,
    });
  });

  it("emits the full parameters with the physics level changed", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({
      ...DEFAULT_PARAMETERS,
      physicsLevel: "advanced",
    });

    await user.click(screen.getByRole("radio", { name: "Kelvin" }));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_PARAMETERS,
      physicsLevel: "kelvin",
    });
  });
});
