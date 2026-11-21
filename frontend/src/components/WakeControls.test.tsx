import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { WakeControls } from "./WakeControls";
import { DEFAULT_DUCK_SPECIES } from "../duckSpecies";
import { DEFAULT_CONTROLS } from "../types";

function renderControls(props: Partial<ComponentProps<typeof WakeControls>> = {}) {
  return render(
    <WakeControls
      species={DEFAULT_DUCK_SPECIES}
      values={DEFAULT_CONTROLS}
      onSpeciesChange={vi.fn()}
      onChange={vi.fn()}
      {...props}
    />,
  );
}

describe("WakeControls", () => {
  it("displays initial duck length and swimming speed", () => {
    renderControls();

    expect(screen.getByLabelText("Duck length")).toHaveValue("0.55");
    expect(screen.getByLabelText("Swimming speed")).toHaveValue("1.2");
    expect(screen.getByText("Duck length (0.55 m)")).toBeInTheDocument();
    expect(screen.getByText("Swimming speed (1.20 m/s)")).toBeInTheDocument();
  });

  it("notifies onChange when a slider moves", () => {
    const onChange = vi.fn();
    renderControls({ onChange });

    fireEvent.change(screen.getByLabelText("Swimming speed"), {
      target: { value: "2.0" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_CONTROLS,
      speedMS: 2.0,
    });
  });

  it("lists the supported species and shows the current one", () => {
    renderControls({ species: "teal" });

    const select = screen.getByLabelText("Duck species");
    expect(select).toHaveValue("teal");
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Teal", "Mallard", "Muscovy"]);
  });

  it("notifies onSpeciesChange with the species id", () => {
    const onSpeciesChange = vi.fn();
    renderControls({ onSpeciesChange });

    fireEvent.change(screen.getByLabelText("Duck species"), {
      target: { value: "muscovy" },
    });

    expect(onSpeciesChange).toHaveBeenCalledWith("muscovy");
  });

  describe("physics mode", () => {
    it("lists both modes with Kelvin selected by default", () => {
      renderControls();

      const select = screen.getByLabelText("Physics mode");
      expect(select).toHaveValue("kelvin");
      expect(
        within(select).getAllByRole("option").map((o) => o.textContent),
      ).toEqual(["Kelvin (Classic)", "Advanced (Speed-dependent)"]);
    });

    it("notifies onChange with the new mode and preserves other values", () => {
      const onChange = vi.fn();
      renderControls({ onChange });

      fireEvent.change(screen.getByLabelText("Physics mode"), {
        target: { value: "advanced" },
      });

      expect(onChange).toHaveBeenCalledWith({
        ...DEFAULT_CONTROLS,
        physicsMode: "advanced",
      });
    });

    it("keeps species and speed controls working alongside the mode", () => {
      const onChange = vi.fn();
      const onSpeciesChange = vi.fn();
      renderControls({
        onChange,
        onSpeciesChange,
        values: { ...DEFAULT_CONTROLS, physicsMode: "advanced" },
      });

      fireEvent.change(screen.getByLabelText("Swimming speed"), {
        target: { value: "2.5" },
      });
      expect(onChange).toHaveBeenCalledWith({
        ...DEFAULT_CONTROLS,
        physicsMode: "advanced",
        speedMS: 2.5,
      });

      fireEvent.change(screen.getByLabelText("Duck species"), {
        target: { value: "teal" },
      });
      expect(onSpeciesChange).toHaveBeenCalledWith("teal");
    });

    it("shows the Kelvin explanation without the approximation label", () => {
      renderControls();

      expect(screen.getByTestId("physics-mode-description")).toHaveTextContent(
        "The classical Kelvin wake has a fixed half-angle of approximately 19.47° in ideal deep water.",
      );
      expect(
        screen.queryByText(/simplified educational approximation/i),
      ).not.toBeInTheDocument();
    });

    it("shows the advanced explanation and labels it an approximation", () => {
      renderControls({ values: { ...DEFAULT_CONTROLS, physicsMode: "advanced" } });

      expect(screen.getByTestId("physics-mode-description")).toHaveTextContent(
        "The Kelvin envelope remains fixed, but the most visible waves may concentrate into a narrower region at higher Froude numbers.",
      );
      expect(
        screen.getByText(/simplified educational approximation/i),
      ).toBeInTheDocument();
    });
  });

  describe("custom length hint", () => {
    it("is hidden at the preset length", () => {
      renderControls();
      expect(screen.queryByTestId("custom-length-hint")).not.toBeInTheDocument();
    });

    it("appears when the length differs from the species preset", () => {
      renderControls({ values: { ...DEFAULT_CONTROLS, duckLengthM: 0.9 } });

      expect(screen.getByLabelText("Duck species")).toHaveValue("mallard");
      expect(screen.getByTestId("custom-length-hint")).toHaveTextContent(
        "Custom length: preset is 0.55 m",
      );
    });
  });
});
