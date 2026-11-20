import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WakeVisualization } from "./WakeVisualization";
import { makeWakeResponse } from "../test/wakeFixtures";

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
});
