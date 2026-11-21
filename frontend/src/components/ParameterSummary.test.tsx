import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParameterSummary } from "./ParameterSummary";
import { makeWakeResponse } from "../test/wakeFixtures";
import { DEFAULT_CONTROLS } from "../types";

describe("ParameterSummary", () => {
  it("always shows duck length and swimming speed", () => {
    render(<ParameterSummary values={DEFAULT_CONTROLS} wake={null} />);

    expect(screen.getByTestId("param-body-length")).toHaveTextContent(
      "0.50 m",
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
    render(<ParameterSummary values={DEFAULT_CONTROLS} wake={wake} />);

    expect(screen.getByTestId("wake-froude")).toHaveTextContent("0.541");
    expect(screen.getByTestId("wake-half-angle")).toHaveTextContent("19.47°");
  });
});
