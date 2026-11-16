import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the application title", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Duck Wake Lab" }),
    ).toBeInTheDocument();
  });

  it("renders the duck species selector", () => {
    render(<App />);
    expect(screen.getByLabelText("Duck species")).toBeInTheDocument();
  });

  it("renders body length and swimming speed controls", () => {
    render(<App />);
    expect(screen.getByLabelText("Body length")).toBeInTheDocument();
    expect(screen.getByLabelText("Swimming speed")).toBeInTheDocument();
  });

  it("updates displayed parameters when controls change", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Duck species"), "Teal");
    expect(screen.getByTestId("param-species")).toHaveTextContent("Teal");

    fireEvent.change(screen.getByLabelText("Swimming speed"), {
      target: { value: "1.25" },
    });
    expect(screen.getByTestId("param-speed")).toHaveTextContent("1.25 m/s");

    fireEvent.change(screen.getByLabelText("Body length"), {
      target: { value: "0.80" },
    });
    expect(screen.getByTestId("param-body-length")).toHaveTextContent("0.80 m");
  });

  it("renders the canvas placeholder", () => {
    render(<App />);
    expect(
      screen.getByRole("img", { name: "Wake visualization placeholder" }),
    ).toBeInTheDocument();
  });
});
