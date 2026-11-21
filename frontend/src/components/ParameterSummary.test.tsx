import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParameterSummary } from "./ParameterSummary";
import { makeAdvancedWakeResponse, makeWakeResponse } from "../test/wakeFixtures";
import { DEFAULT_CONTROLS } from "../types";

describe("ParameterSummary", () => {
  it("always shows species, duck length and swimming speed", () => {
    render(
      <ParameterSummary
        species="mallard"
        values={DEFAULT_CONTROLS}
        wake={null}
      />,
    );

    expect(screen.getByTestId("param-species")).toHaveTextContent("Mallard");
    expect(screen.getByTestId("param-body-length")).toHaveTextContent(
      "0.55 m",
    );
    expect(screen.getByTestId("param-speed")).toHaveTextContent("1.20 m/s");
    expect(screen.queryByTestId("wake-froude")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wake-half-angle")).not.toBeInTheDocument();
  });

  it("shows Froude number and Kelvin half-angle when wake is present", () => {
    const wake = makeWakeResponse({
      froude_number: 0.54123,
      kelvin_angle_deg: 19.47122,
    });
    render(
      <ParameterSummary
        species="mallard"
        values={DEFAULT_CONTROLS}
        wake={wake}
      />,
    );

    expect(screen.getByTestId("wake-froude")).toHaveTextContent("0.541");
    expect(screen.getByTestId("wake-half-angle")).toHaveTextContent("19.47°");
  });

  it("shows the actual length, not the preset length, for the species", () => {
    render(
      <ParameterSummary
        species="teal"
        values={{ ...DEFAULT_CONTROLS, duckLengthM: 0.62 }}
        wake={null}
      />,
    );

    expect(screen.getByTestId("param-species")).toHaveTextContent("Teal");
    expect(screen.getByTestId("param-body-length")).toHaveTextContent(
      "0.62 m",
    );
  });

  it("labels a species whose length was changed manually", () => {
    render(
      <ParameterSummary
        species="mallard"
        values={{ ...DEFAULT_CONTROLS, duckLengthM: 0.9 }}
        wake={null}
      />,
    );

    expect(screen.getByTestId("param-species")).toHaveTextContent(
      "Mallard (custom length)",
    );
  });

  it("shows the plain species name at its preset length", () => {
    render(
      <ParameterSummary
        species="mallard"
        values={DEFAULT_CONTROLS}
        wake={null}
      />,
    );

    expect(screen.getByTestId("param-species")).toHaveTextContent(/^Mallard$/);
  });

  it("shows the selected physics mode", () => {
    render(
      <ParameterSummary
        species="mallard"
        values={{ ...DEFAULT_CONTROLS, physicsMode: "advanced" }}
        wake={null}
      />,
    );

    expect(screen.getByTestId("param-physics-mode")).toHaveTextContent(
      "Advanced (Speed-dependent)",
    );
  });

  it("hides the apparent angle in Kelvin mode", () => {
    render(
      <ParameterSummary
        species="mallard"
        values={DEFAULT_CONTROLS}
        wake={makeWakeResponse()}
      />,
    );

    expect(screen.queryByTestId("wake-apparent-angle")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("apparent-equals-kelvin-note"),
    ).not.toBeInTheDocument();
  });

  it("shows both angles in advanced mode at high Froude number", () => {
    render(
      <ParameterSummary
        species="teal"
        values={{ ...DEFAULT_CONTROLS, physicsMode: "advanced" }}
        wake={makeAdvancedWakeResponse()}
      />,
    );

    expect(screen.getByTestId("wake-half-angle")).toHaveTextContent("19.47°");
    expect(screen.getByTestId("wake-apparent-angle")).toHaveTextContent("14.04°");
    expect(
      screen.queryByTestId("apparent-equals-kelvin-note"),
    ).not.toBeInTheDocument();
  });

  it("explains that the apparent wake equals Kelvin below the Froude threshold", () => {
    render(
      <ParameterSummary
        species="mallard"
        values={{ ...DEFAULT_CONTROLS, physicsMode: "advanced" }}
        wake={makeWakeResponse({ physics_mode: "advanced", froude_number: 0.5 })}
      />,
    );

    expect(screen.getByTestId("apparent-equals-kelvin-note")).toHaveTextContent(
      "Fr > 1.41",
    );
  });
});
