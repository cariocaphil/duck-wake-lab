import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WakeVisualization } from "./WakeVisualization";
import { makeAdvancedWakeResponse, makeWakeResponse } from "../test/wakeFixtures";

describe("WakeVisualization", () => {
  it("renders port and starboard polylines from returned coordinates", () => {
    const wake = makeWakeResponse();
    render(<WakeVisualization wake={wake} loading={false} error={null} />);

    expect(screen.getByTestId("wake-port")).toHaveAttribute(
      "points",
      "0,0 -2.5,-0.88 -5,-1.77",
    );
    expect(screen.getByTestId("wake-starboard")).toHaveAttribute(
      "points",
      "0,0 -2.5,0.88 -5,1.77",
    );
    expect(screen.getByTestId("wake-duck")).toBeInTheDocument();
    expect(screen.getByTestId("swim-direction")).toBeInTheDocument();
  });

  it("shows a loading message before the first response", () => {
    render(<WakeVisualization wake={null} loading={true} error={null} />);
    const status = screen.getByTestId("wake-status");
    expect(status).toHaveTextContent("Loading wake geometry…");
    expect(status).toHaveClass("wake-status--info");
    expect(status).toHaveAttribute("role", "status");
    expect(screen.getAllByText("Loading wake geometry…")).toHaveLength(1);
  });

  it("shows an API error message", () => {
    render(
      <WakeVisualization
        wake={null}
        loading={false}
        error="Wake request failed (500)"
      />,
    );
    const status = screen.getByTestId("wake-status");
    expect(status).toHaveTextContent("Wake request failed (500)");
    expect(status).toHaveClass("wake-status--error");
    expect(status).toHaveAttribute("role", "alert");
    expect(screen.getAllByText("Wake request failed (500)")).toHaveLength(1);
  });

  it("renders only the Kelvin envelope (no apparent wake or legend) in Kelvin mode", () => {
    render(
      <WakeVisualization wake={makeWakeResponse()} loading={false} error={null} />,
    );

    expect(screen.getByTestId("wake-svg")).toHaveAttribute(
      "aria-label",
      "Kelvin wake envelope",
    );
    expect(screen.getByTestId("wake-port")).not.toHaveClass("wake-envelope-arm");
    expect(screen.queryByTestId("wake-apparent-port")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wake-apparent-starboard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wake-apparent-region")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wake-legend")).not.toBeInTheDocument();
  });

  it("renders the Kelvin envelope and a narrower apparent wake in advanced mode", () => {
    const wake = makeAdvancedWakeResponse();
    render(<WakeVisualization wake={wake} loading={false} error={null} />);

    expect(screen.getByTestId("wake-svg")).toHaveAttribute(
      "aria-label",
      "Kelvin envelope and apparent wake",
    );
    // Envelope arms keep the Kelvin coordinates, drawn dashed.
    expect(screen.getByTestId("wake-port")).toHaveClass("wake-envelope-arm");
    expect(screen.getByTestId("wake-port")).toHaveAttribute(
      "points",
      "0,0 -2.5,-0.88 -5,-1.77",
    );
    // Apparent arms use the apparent coordinates, which are narrower.
    expect(screen.getByTestId("wake-apparent-port")).toHaveAttribute(
      "points",
      "0,0 -2.5,-0.62 -5,-1.25",
    );
    expect(screen.getByTestId("wake-apparent-starboard")).toHaveAttribute(
      "points",
      "0,0 -2.5,0.62 -5,1.25",
    );
    expect(screen.getByTestId("wake-apparent-region")).toBeInTheDocument();

    const legend = screen.getByTestId("wake-legend");
    expect(legend).toHaveTextContent("Kelvin envelope (fixed)");
    expect(legend).toHaveTextContent("Apparent wake (dominant)");
  });

  it("returns to the Kelvin-only drawing when rerendered with a Kelvin response", () => {
    const { rerender } = render(
      <WakeVisualization
        wake={makeAdvancedWakeResponse()}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByTestId("wake-apparent-port")).toBeInTheDocument();

    rerender(
      <WakeVisualization wake={makeWakeResponse()} loading={false} error={null} />,
    );
    expect(screen.queryByTestId("wake-apparent-port")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wake-legend")).not.toBeInTheDocument();
  });
});
