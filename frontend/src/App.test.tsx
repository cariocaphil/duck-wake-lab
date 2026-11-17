import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  createMockCanvasContext,
  mockCanvasGetContext,
} from "./test/mockCanvasContext";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  describe("layout", () => {
    it("renders the header, controls, visualization and summary", () => {
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
    });

    it("renders the canvas placeholder", () => {
      render(<App />);
      expect(
        screen.getByRole("img", { name: "Wake visualization placeholder" }),
      ).toBeInTheDocument();
    });
  });

  describe("defaults", () => {
    it("starts with the default duck parameters", () => {
      render(<App />);
      expect(screen.getByLabelText("Duck species")).toHaveValue("Mallard");
      expect(screen.getByTestId("param-species")).toHaveTextContent("Mallard");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.50 m",
      );
      expect(screen.getByTestId("param-speed")).toHaveTextContent("0.70 m/s");
      expect(screen.getByTestId("param-physics")).toHaveTextContent("Kelvin");
    });

    it("selects the Kelvin level and keeps Advanced disabled", () => {
      render(<App />);
      expect(screen.getByRole("radio", { name: "Kelvin" })).toBeChecked();
      expect(
        screen.getByRole("radio", { name: "Advanced (coming soon)" }),
      ).toBeDisabled();
    });
  });

  describe("shared parameter state", () => {
    it("updates the summary when the species changes", async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.selectOptions(screen.getByLabelText("Duck species"), "Teal");

      expect(screen.getByTestId("param-species")).toHaveTextContent("Teal");
    });

    it("updates the summary when the sliders move", () => {
      render(<App />);

      fireEvent.change(screen.getByLabelText("Swimming speed"), {
        target: { value: "1.25" },
      });
      fireEvent.change(screen.getByLabelText("Body length"), {
        target: { value: "0.80" },
      });

      expect(screen.getByTestId("param-speed")).toHaveTextContent("1.25 m/s");
      expect(screen.getByTestId("param-body-length")).toHaveTextContent(
        "0.80 m",
      );
    });

    it("keeps the slider labels in sync with the values", () => {
      render(<App />);

      fireEvent.change(screen.getByLabelText("Swimming speed"), {
        target: { value: "1.25" },
      });

      expect(screen.getByText("Swimming speed (1.25 m/s)")).toBeInTheDocument();
    });

    it("repaints the canvas with the newly selected parameters", async () => {
      const user = userEvent.setup();
      const context = createMockCanvasContext();
      mockCanvasGetContext(context);
      render(<App />);

      await user.selectOptions(screen.getByLabelText("Duck species"), "Teal");
      fireEvent.change(screen.getByLabelText("Swimming speed"), {
        target: { value: "1.25" },
      });

      const drawnText = context.fillText.mock.calls.map((call) => call[0]);
      expect(drawnText).toContain("Teal · 1.25 m/s · Kelvin model");
    });
  });
});
