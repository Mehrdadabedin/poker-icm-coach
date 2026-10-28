/* The tab bar follows the session wherever it ends (plan 099 follow-up). */
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { clearAuth, saveAuth } from "../src/services/api";
import { useSignedIn } from "../src/services/authEvents";

function Probe() {
  return <p data-testid="state">{useSignedIn() ? "in" : "out"}</p>;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("useSignedIn", () => {
  it("follows saveAuth and clearAuth, not only the sign-in screen", () => {
    render(<Probe />);
    expect(screen.getByTestId("state")).toHaveTextContent("out");
    act(() => saveAuth("token", "ana"));
    expect(screen.getByTestId("state")).toHaveTextContent("in");
    act(() => clearAuth());
    expect(screen.getByTestId("state")).toHaveTextContent("out");
  });
});
