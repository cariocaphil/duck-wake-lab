import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("renders the application title as a top-level heading", () => {
    render(<AppHeader />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Duck Wake Lab" }),
    ).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<AppHeader />);
    expect(
      screen.getByText("Explore the physics behind a swimming duck's wake."),
    ).toBeInTheDocument();
  });
});
