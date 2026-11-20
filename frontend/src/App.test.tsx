import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  expectPostedWake,
  makeWakeResponse,
  mockJsonResponse,
  point,
} from "./test/wakeFixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockWakeFetch(wake = makeWakeResponse()) {
  const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(wake));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("App", () => {
  describe("layout", () => {
    it("renders the header, controls, visualization and summary", async () => {
      mockWakeFetch();
      render(<App />);

      expect(
        screen.getByRole("heading", { name: "Duck Wake Lab" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Duck controls" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Wake visualization" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("complementary", { name: "Selected parameters" }),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId("wake-svg")).toBeInTheDocument();
      });
    });
  });

  describe("defaults", () => {
    it("starts with the default duck length and speed", async () => {
      mockWakeFetch();
      render(<App />);

      expect(screen.getByLabelText("Duck length")).toHaveValue("0.5");
      expect(screen.getByLabelText("Swimming speed")).toHaveValue("1.2");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.50 m",
      );
      expect(screen.getByTestId("param-speed")).toHaveTextContent("1.20 m/s");

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toBeInTheDocument();
      });
    });
  });

  describe("interaction", () => {
    it("updates displayed values and requests new wake geometry", async () => {
      const fetchMock = mockWakeFetch();
      render(<App />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });

      fireEvent.change(screen.getByLabelText("Swimming speed"), {
        target: { value: "2.0" },
      });
      fireEvent.change(screen.getByLabelText("Duck length"), {
        target: { value: "0.8" },
      });

      expect(screen.getByTestId("param-speed")).toHaveTextContent("2.00 m/s");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.80 m",
      );

      await waitFor(() => {
        expectPostedWake(
          fetchMock,
          { duck_length_m: 0.8, swimming_speed_m_s: 2.0 },
          -1,
        );
      });
    });

    it("renders returned coordinates as SVG polylines", async () => {
      mockWakeFetch(
        makeWakeResponse({
          port_boundary: [point(0, 0), point(-1, 0.5)],
          starboard_boundary: [point(0, 0), point(-1, -0.5)],
        }),
      );
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("wake-port")).toHaveAttribute(
          "points",
          "0,0 -1,-0.5",
        );
      });
      expect(screen.getByTestId("wake-starboard")).toHaveAttribute(
        "points",
        "0,0 -1,0.5",
      );
    });

    it("shows an error when the API fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            mockJsonResponse({ detail: "server error" }, 500),
          ),
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("wake-status")).toHaveTextContent(/500/);
      });
    });
  });
});
