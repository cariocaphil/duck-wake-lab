import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DUCK_SPECIES } from "../types";
import { SpeciesSelect } from "./SpeciesSelect";

describe("SpeciesSelect", () => {
  it("shows the current species as selected", () => {
    render(<SpeciesSelect value="Teal" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Duck species")).toHaveValue("Teal");
  });

  it("offers every known species", () => {
    render(<SpeciesSelect value="Mallard" onChange={vi.fn()} />);
    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual([...DUCK_SPECIES]);
  });

  it("calls onChange with the chosen species", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SpeciesSelect value="Mallard" onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Duck species"), "Muscovy");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("Muscovy");
  });

  it("ignores values that are not a known species", () => {
    const onChange = vi.fn();
    render(<SpeciesSelect value="Mallard" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Duck species"), {
      target: { value: "Pelican" },
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
