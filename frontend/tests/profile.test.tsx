/* Player profile (plan 095): the details form, the greeting, data download
 * and account deletion, against a fake server. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { ProfilePage } from "../src/pages/ProfilePage";
import { ageOn } from "../src/services/profileApi";

vi.mock("../src/services/portraitApi", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getMyPortrait: () => Promise.resolve({ status: "none", image: null }),
}));

type Reply = { status: number; body: unknown };
const ANA = { firstName: "Ana", lastName: "Torres", displayName: "Ana T.", birthday: "1990-03-02",
  gender: "woman", genderText: null };
const ACCOUNT = { username: "ana", admin: false, signIn: "password", email: null };
let replies: Record<string, Reply>;
const calls: { key: string; body: unknown }[] = [];

function serve(key: string, reply: Reply) { replies[key] = reply; }

beforeEach(() => {
  localStorage.setItem("icm_auth_token", "tok");
  localStorage.setItem("icm_username", "ana");
  calls.length = 0;
  replies = {
    "GET /api/profile": { status: 404, body: { detail: "no profile yet" } },
    "GET /api/account": { status: 200, body: ACCOUNT },
  };
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    calls.push({ key, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const reply = replies[key] ?? { status: 500, body: {} };
    return Promise.resolve(new Response(JSON.stringify(reply.body), { status: reply.status }));
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

const open = (lang: "en" | "es" = "en") => render(
  <I18nProvider initial={lang}><MemoryRouter initialEntries={["/profile"]}><Routes>
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/login" element={<p>sign in</p>} />
    <Route path="/" element={<p>landing</p>} />
  </Routes></MemoryRouter></I18nProvider>);
const type = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });
const sent = (key: string) => calls.filter((c) => c.key === key);

describe("profile details", () => {
  it("sends a signed-out visitor to sign in", () => {
    localStorage.clear();
    open();
    expect(screen.getByText("sign in")).toBeInTheDocument();
  });

  it("starts from the username, saves the details and greets by first name", async () => {
    open();
    expect(await screen.findByTestId("profile-form")).toBeInTheDocument();
    expect(screen.getByTestId("profile-displayName")).toHaveValue("ana");
    expect(screen.getByTestId("profile-greeting").textContent).toBe("Your profile");
    serve("PUT /api/profile", { status: 200, body: ANA });
    type("profile-firstName", "Ana");
    type("profile-lastName", "Torres");
    type("profile-displayName", "Ana T.");
    type("profile-birthday", "1990-03-02");
    type("profile-gender", "woman");
    fireEvent.click(screen.getByTestId("profile-save"));
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
    expect(sent("PUT /api/profile")[0].body).toEqual(ANA);
    expect(screen.getByTestId("profile-greeting").textContent).toBe("Welcome, Ana");
  });

  it("greets in Spanish with the right gender", async () => {
    serve("GET /api/profile", { status: 200, body: ANA });
    open("es");
    await waitFor(() => expect(screen.getByTestId("profile-greeting").textContent).toBe("Bienvenida, Ana"));
  });

  it("refuses a player under 18 before sending anything", async () => {
    open();
    await screen.findByTestId("profile-form");
    type("profile-birthday", `${new Date().getFullYear() - 10}-01-01`);
    fireEvent.click(screen.getByTestId("profile-save"));
    expect(await screen.findByTestId("profile-birthday-error")).toHaveTextContent("18 or older");
    expect(sent("PUT /api/profile")).toHaveLength(0);
  });

  it("shows the field the server refused", async () => {
    serve("PUT /api/profile", { status: 422, body: { detail: [{ loc: ["body", "lastName"], msg: "bad" }] } });
    open();
    await screen.findByTestId("profile-form");
    type("profile-birthday", "1990-03-02");
    fireEvent.click(screen.getByTestId("profile-save"));
    expect(await screen.findByTestId("profile-lastName-error")).toHaveTextContent("Use 1 to 40 letters.");
  });

  it("asks for a description only for a self-described gender", async () => {
    open();
    await screen.findByTestId("profile-form");
    expect(screen.queryByTestId("profile-genderText")).toBeNull();
    type("profile-gender", "self_described");
    expect(screen.getByTestId("profile-genderText")).toBeInTheDocument();
  });
});

describe("account", () => {
  it("deletes a password account with its password, then signs out", async () => {
    serve("DELETE /api/account", { status: 200, body: { deleted: true } });
    open();
    fireEvent.click(await screen.findByTestId("account-delete"));
    type("account-proof", "secret-pass");
    fireEvent.click(screen.getByTestId("account-confirm-delete"));
    expect(await screen.findByText("landing")).toBeInTheDocument();
    expect(sent("DELETE /api/account")[0].body).toEqual({ password: "secret-pass" });
    expect(localStorage.getItem("icm_auth_token")).toBeNull();
  });

  it("keeps the account and says so when the password is wrong", async () => {
    serve("DELETE /api/account", { status: 403, body: { detail: "the password is not correct" } });
    open();
    fireEvent.click(await screen.findByTestId("account-delete"));
    type("account-proof", "wrong");
    fireEvent.click(screen.getByTestId("account-confirm-delete"));
    expect(await screen.findByTestId("account-error")).toHaveTextContent("The password is not correct.");
    expect(localStorage.getItem("icm_auth_token")).toBe("tok");
  });

  it("asks a Google account to type DELETE", async () => {
    serve("GET /api/account", { status: 200, body: { ...ACCOUNT, signIn: "google", email: "a@example.com" } });
    serve("DELETE /api/account", { status: 200, body: { deleted: true } });
    open();
    expect(await screen.findByText("You sign in with Google (a@example.com).")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("account-delete"));
    type("account-proof", "delete");
    fireEvent.click(screen.getByTestId("account-confirm-delete"));
    expect(await screen.findByTestId("account-error")).toHaveTextContent("Type DELETE in capital letters.");
    expect(sent("DELETE /api/account")).toHaveLength(0);
    type("account-proof", "DELETE");
    fireEvent.click(screen.getByTestId("account-confirm-delete"));
    expect(await screen.findByText("landing")).toBeInTheDocument();
    expect(sent("DELETE /api/account")[0].body).toEqual({ confirm: "DELETE" });
  });

  it("offers no delete to an Admin", async () => {
    serve("GET /api/account", { status: 200, body: { ...ACCOUNT, admin: true } });
    open();
    expect(await screen.findByText("An Admin account cannot delete itself.")).toBeInTheDocument();
    expect(screen.queryByTestId("account-delete")).toBeNull();
  });

  it("downloads the player's data as a JSON file", async () => {
    serve("GET /api/account/export", { status: 200, body: { account: ACCOUNT } });
    URL.createObjectURL = vi.fn(() => "blob:data");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("icmbot-data-ana.json");
    });
    open();
    fireEvent.click(await screen.findByTestId("account-download"));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:data");
    click.mockRestore();
  });
});

describe("ageOn", () => {
  it.each([
    ["2008-10-23", new Date(2026, 9, 23), 18],
    ["2008-10-24", new Date(2026, 9, 23), 17],
    ["2008-02-29", new Date(2026, 1, 28), 17],
    ["2008-02-29", new Date(2026, 2, 1), 18],
  ])("%s on %s is %i", (birthday, today, age) => {
    expect(ageOn(birthday, today)).toBe(age);
  });
});
