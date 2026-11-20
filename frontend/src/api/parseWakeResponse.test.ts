import { describe, expect, it } from "vitest";
import { parseWakeResponse, WakeParseError } from "./parseWakeResponse";
import { makeWakeResponse } from "../test/wakeFixtures";

describe("parseWakeResponse", () => {
  it("accepts a valid wake fixture", () => {
    const wake = makeWakeResponse();
    expect(parseWakeResponse(wake)).toEqual(wake);
  });

  it("rejects a missing scalar field", () => {
    const wake = makeWakeResponse();
    const rest = { ...wake } as Record<string, unknown>;
    delete rest.froude_number;
    expect(() => parseWakeResponse(rest)).toThrow(WakeParseError);
    expect(() => parseWakeResponse(rest)).toThrow(/froude_number/);
  });

  it("rejects a non-finite scalar", () => {
    expect(() =>
      parseWakeResponse(makeWakeResponse({ froude_number: Number.NaN })),
    ).toThrow(/froude_number/);
  });

  it("rejects unequal coordinate array lengths", () => {
    expect(() =>
      parseWakeResponse(
        makeWakeResponse({
          starboard_y_m: [0, -0.88],
        }),
      ),
    ).toThrow(/same length/);
  });

  it("rejects arms that do not start at the origin", () => {
    expect(() =>
      parseWakeResponse(
        makeWakeResponse({
          port_x_m: [0.1, -2.5, -5],
        }),
      ),
    ).toThrow(/origin/);
  });

  it("rejects non-finite coordinates", () => {
    expect(() =>
      parseWakeResponse(
        makeWakeResponse({
          port_y_m: [0, Number.POSITIVE_INFINITY, 1.77],
        }),
      ),
    ).toThrow(/port_y_m/);
  });
});
