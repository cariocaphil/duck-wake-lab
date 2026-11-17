import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMETERS, type DuckParameters } from "../types";
import { ParameterSummary } from "./ParameterSummary";

describe("ParameterSummary", () => {
  it("is exposed as a labelled complementary region", () => {
    render(<ParameterSummary parameters={DEFAULT_PARAMETERS} />);
    expect(
      screen.getByRole("complementary", { name: "Selected parameters" }),
    ).toBeInTheDocument();
  });

  it("shows the default parameters with units", () => {
    render(<ParameterSummary parameters={DEFAULT_PARAMETERS} />);
    expect(screen.getByTestId("param-species")).toHaveTextContent("Mallard");
    expect(screen.getByTestId("param-body-length")).toHaveTextContent(
      "0.50 m",
    );
    expect(screen.getByTestId("param-speed")).toHaveTextContent("0.70 m/s");
    expect(screen.getByTestId("param-physics")).toHaveTextContent("Kelvin");
  });

  it("formats values to two decimals and uses the physics level label", () => {
    const parameters: DuckParameters = {
      species: "Muscovy",
      bodyLength: 0.8,
      speed: 1.256,
      physicsLevel: "advanced",
    };
    render(<ParameterSummary parameters={parameters} />);

    expect(screen.getByTestId("param-species")).toHaveTextContent("Muscovy");
    expect(screen.getByTestId("param-body-length")).toHaveTextContent(
      "0.80 m",
    );
    expect(screen.getByTestId("param-speed")).toHaveTextContent("1.26 m/s");
    expect(screen.getByTestId("param-physics")).toHaveTextContent("Advanced");
  });

  it("pairs each label with its value", () => {
    render(<ParameterSummary parameters={DEFAULT_PARAMETERS} />);
    for (const label of [
      "Species",
      "Body length",
      "Swimming speed",
      "Physics level",
    ]) {
      expect(screen.getByText(label).tagName).toBe("DT");
    }
  });
});
