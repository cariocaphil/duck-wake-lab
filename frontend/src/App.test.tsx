import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  expectPostedWake,
  makeAdvancedWakeResponse,
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

/** Fetch mock that answers according to the posted physics_mode. */
function mockModeAwareFetch() {
  const fetchMock = vi
    .fn()
    .mockImplementation((_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { physics_mode: string };
      return Promise.resolve(
        mockJsonResponse(
          body.physics_mode === "advanced"
            ? makeAdvancedWakeResponse()
            : makeWakeResponse(),
        ),
      );
    });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function selectMode(value: string) {
  fireEvent.change(screen.getByLabelText("Physics mode"), {
    target: { value },
  });
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

      expect(screen.getByLabelText("Duck length")).toHaveValue("0.55");
      expect(screen.getByLabelText("Swimming speed")).toHaveValue("1.2");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.55 m",
      );
      expect(screen.getByTestId("param-speed")).toHaveTextContent("1.20 m/s");

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toBeInTheDocument();
      });
    });
  });

  describe("species presets", () => {
    function selectSpecies(value: string) {
      fireEvent.change(screen.getByLabelText("Duck species"), {
        target: { value },
      });
    }

    it("starts with Mallard selected at 0.55 m", async () => {
      mockWakeFetch();
      render(<App />);

      expect(screen.getByLabelText("Duck species")).toHaveValue("mallard");
      expect(screen.getByLabelText("Duck length")).toHaveValue("0.55");
      expect(screen.getByTestId("param-species")).toHaveTextContent("Mallard");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.55 m",
      );

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toBeInTheDocument();
      });
    });

    it("selecting Teal sets the length to 0.35 m", async () => {
      mockWakeFetch();
      render(<App />);

      selectSpecies("teal");

      expect(screen.getByLabelText("Duck length")).toHaveValue("0.35");
      expect(screen.getByText("Duck length (0.35 m)")).toBeInTheDocument();
      expect(screen.getByTestId("param-species")).toHaveTextContent("Teal");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.35 m",
      );

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toBeInTheDocument();
      });
    });

    it("selecting Muscovy sets the length to 0.75 m", async () => {
      mockWakeFetch();
      render(<App />);

      selectSpecies("muscovy");

      expect(screen.getByLabelText("Duck length")).toHaveValue("0.75");
      expect(screen.getByTestId("param-species")).toHaveTextContent("Muscovy");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.75 m",
      );

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toBeInTheDocument();
      });
    });

    it("preserves swimming speed when the species changes", async () => {
      mockWakeFetch();
      render(<App />);

      fireEvent.change(screen.getByLabelText("Swimming speed"), {
        target: { value: "2.0" },
      });
      selectSpecies("teal");

      expect(screen.getByLabelText("Swimming speed")).toHaveValue("2");
      expect(screen.getByTestId("param-speed")).toHaveTextContent("2.00 m/s");

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toBeInTheDocument();
      });
    });

    it("keeps the selected species when the length is changed manually", async () => {
      mockWakeFetch();
      render(<App />);

      fireEvent.change(screen.getByLabelText("Duck length"), {
        target: { value: "0.62" },
      });

      expect(screen.getByLabelText("Duck species")).toHaveValue("mallard");
      expect(screen.getByTestId("param-species")).toHaveTextContent("Mallard");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.62 m",
      );

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toBeInTheDocument();
      });
    });

    it("applies the new preset when a species is selected after a manual override", async () => {
      mockWakeFetch();
      render(<App />);

      fireEvent.change(screen.getByLabelText("Duck length"), {
        target: { value: "0.62" },
      });
      selectSpecies("muscovy");

      expect(screen.getByLabelText("Duck length")).toHaveValue("0.75");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.75 m",
      );

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toBeInTheDocument();
      });
    });

    it("requests a new wake with the preset length and unchanged speed", async () => {
      const fetchMock = mockWakeFetch();
      render(<App />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });

      selectSpecies("teal");

      await waitFor(() => {
        expectPostedWake(
          fetchMock,
          { duck_length_m: 0.35, swimming_speed_m_s: 1.2 },
          -1,
        );
      });
    });

    it("requests a new wake after a manual length change", async () => {
      const fetchMock = mockWakeFetch();
      render(<App />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });

      fireEvent.change(screen.getByLabelText("Duck length"), {
        target: { value: "0.62" },
      });

      await waitFor(() => {
        expectPostedWake(
          fetchMock,
          { duck_length_m: 0.62, swimming_speed_m_s: 1.2 },
          -1,
        );
      });
    });

    it("displays the Froude number from the latest API response", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          mockJsonResponse(makeWakeResponse({ froude_number: 0.541 })),
        )
        .mockResolvedValueOnce(
          mockJsonResponse(makeWakeResponse({ froude_number: 0.9 })),
        );
      vi.stubGlobal("fetch", fetchMock);
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toHaveTextContent("0.541");
      });

      selectSpecies("teal");

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toHaveTextContent("0.900");
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
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

  describe("physics mode", () => {
    it("selects Kelvin by default and requests kelvin mode", async () => {
      const fetchMock = mockModeAwareFetch();
      render(<App />);

      expect(screen.getByLabelText("Physics mode")).toHaveValue("kelvin");
      expect(screen.getByTestId("param-physics-mode")).toHaveTextContent(
        "Kelvin (Classic)",
      );
      await waitFor(() => {
        expect(screen.getByTestId("wake-svg")).toBeInTheDocument();
      });
      expectPostedWake(fetchMock, {
        duck_length_m: 0.55,
        swimming_speed_m_s: 1.2,
        physics_mode: "kelvin",
      });
      expect(screen.queryByTestId("wake-apparent-port")).not.toBeInTheDocument();
    });

    it("switching to advanced posts the new mode and renders both wakes", async () => {
      const fetchMock = mockModeAwareFetch();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("wake-svg")).toBeInTheDocument();
      });

      selectMode("advanced");

      await waitFor(() => {
        expectPostedWake(fetchMock, {
          duck_length_m: 0.55,
          swimming_speed_m_s: 1.2,
          physics_mode: "advanced",
        });
      });
      await waitFor(() => {
        expect(screen.getByTestId("wake-apparent-port")).toBeInTheDocument();
      });
      expect(screen.getByTestId("wake-port")).toBeInTheDocument();
      expect(screen.getByTestId("wake-legend")).toBeInTheDocument();
      expect(screen.getByTestId("wake-half-angle")).toHaveTextContent("19.47°");
      expect(screen.getByTestId("wake-apparent-angle")).toHaveTextContent(
        "14.04°",
      );
    });

    it("switching back to Kelvin restores the Kelvin visualization", async () => {
      mockModeAwareFetch();
      render(<App />);

      selectMode("advanced");
      await waitFor(() => {
        expect(screen.getByTestId("wake-apparent-port")).toBeInTheDocument();
      });

      selectMode("kelvin");
      await waitFor(() => {
        expect(
          screen.queryByTestId("wake-apparent-port"),
        ).not.toBeInTheDocument();
      });
      expect(screen.queryByTestId("wake-legend")).not.toBeInTheDocument();
      expect(screen.getByTestId("wake-svg")).toHaveAttribute(
        "aria-label",
        "Kelvin wake envelope",
      );
    });

    it("keeps species and speed controls working in advanced mode", async () => {
      const fetchMock = mockModeAwareFetch();
      render(<App />);

      selectMode("advanced");
      fireEvent.change(screen.getByLabelText("Duck species"), {
        target: { value: "teal" },
      });
      fireEvent.change(screen.getByLabelText("Swimming speed"), {
        target: { value: "3.0" },
      });

      expect(screen.getByLabelText("Physics mode")).toHaveValue("advanced");
      await waitFor(() => {
        expectPostedWake(fetchMock, {
          duck_length_m: 0.35,
          swimming_speed_m_s: 3.0,
          physics_mode: "advanced",
        });
      });
    });

    it("a stale response cannot overwrite a newer mode selection", async () => {
      let resolveStale: ((value: unknown) => void) | undefined;
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveStale = resolve;
            }),
        )
        .mockResolvedValue(mockJsonResponse(makeAdvancedWakeResponse()));
      vi.stubGlobal("fetch", fetchMock);
      render(<App />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      selectMode("advanced");
      await waitFor(() => {
        expect(screen.getByTestId("wake-apparent-port")).toBeInTheDocument();
      });

      // The abandoned Kelvin request finishes late.
      resolveStale?.(mockJsonResponse(makeWakeResponse()));
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(screen.getByTestId("wake-apparent-port")).toBeInTheDocument();
      expect(screen.getByTestId("wake-legend")).toBeInTheDocument();
    });
  });

  describe("custom length label", () => {
    it("labels Mallard as custom after a manual length change and clears on reselect", async () => {
      mockModeAwareFetch();
      render(<App />);

      fireEvent.change(screen.getByLabelText("Duck length"), {
        target: { value: "0.90" },
      });

      expect(screen.getByLabelText("Duck species")).toHaveValue("mallard");
      expect(screen.getByTestId("param-species")).toHaveTextContent(
        "Mallard (custom length)",
      );
      expect(screen.getByTestId("custom-length-hint")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Duck species"), {
        target: { value: "mallard" },
      });

      expect(screen.getByLabelText("Duck length")).toHaveValue("0.55");
      expect(screen.getByTestId("param-species")).toHaveTextContent(/^Mallard$/);
      expect(screen.queryByTestId("custom-length-hint")).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId("wake-froude")).toBeInTheDocument();
      });
    });
  });
});
