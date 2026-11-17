import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PhysicsLevelField } from "./PhysicsLevelField";

describe("PhysicsLevelField", () => {
  it("renders a labelled group with both levels", () => {
    render(<PhysicsLevelField value="kelvin" onChange={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: "Physics level" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("checks the radio matching the current value", () => {
    render(<PhysicsLevelField value="kelvin" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Kelvin" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Advanced (coming soon)" }),
    ).not.toBeChecked();
  });

  it("keeps the advanced level disabled and marked as coming soon", () => {
    render(<PhysicsLevelField value="kelvin" onChange={vi.fn()} />);
    expect(
      screen.getByRole("radio", { name: "Advanced (coming soon)" }),
    ).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Kelvin" })).toBeEnabled();
  });

  it("calls onChange when an enabled level is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhysicsLevelField value="advanced" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Kelvin" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("kelvin");
  });

  it("does not call onChange when the disabled level is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhysicsLevelField value="kelvin" onChange={onChange} />);

    await user.click(
      screen.getByRole("radio", { name: "Advanced (coming soon)" }),
    );

    expect(onChange).not.toHaveBeenCalled();
  });
});
