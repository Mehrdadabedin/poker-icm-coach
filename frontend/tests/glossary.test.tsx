/* The poker glossary (plan 097): every term the app shows a player, in every
 * language, on its own page under STUDY, and the coach's and the reports'
 * abbreviations open their entry with a tap. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CoachPanelView } from "../src/components/CoachPanelView";
import { HomeMenu } from "../src/components/HomeMenu";
import { MobileCoachCard } from "../src/components/MobileCoachCard";
import { PlayerStats } from "../src/components/ReportSections";
import { ROW_TERM, STAT_TERM, TERMS, TOKEN_PATTERN, defKey, exKey, nameKey, termById, tokenTerm } from "../src/glossary/terms";
import { I18nProvider } from "../src/i18n/I18n";
import { LANGS, setCurrentLang, type Lang } from "../src/i18n/lang";
import { en } from "../src/i18n/messages/en";
import { MESSAGES } from "../src/i18n/translate";
import { POSITIONS_9MAX, type CoachAdvice } from "../src/models/game";
import { GlossaryPage } from "../src/pages/GlossaryPage";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request: vi.fn(async () => ({ tableId: null })),
}));

afterEach(() => {
  cleanup();
  setCurrentLang("en");
});

const COACH: CoachAdvice = {
  recommendedAction: "FOLD", street: "preflop", reasoning: "Q8o is not in the CO open range.",
  reasonCode: "open_out", reasonParams: { hand: "Q8o", pos: "CO" },
  detail: { POSITION: "CO", SPR: "3.0", "POT ODDS": "0.25", ACTION: "FOLD" },
};

function atTable(lang: Lang = "en") {
  return render(
    <I18nProvider initial={lang}>
      <MemoryRouter initialEntries={["/table/t1"]}>
        <Routes>
          <Route path="/table/:id" element={<CoachPanelView testId="coach-panel" coach={COACH} />} />
          <Route path="/glossary" element={<GlossaryPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

const glossaryAt = (path: string, lang: Lang = "en") => render(
  <I18nProvider initial={lang}><MemoryRouter initialEntries={[path]}><GlossaryPage /></MemoryRouter></I18nProvider>,
);

describe("the glossary's words", () => {
  it("has a name and a definition for every term in every language", () => {
    for (const lang of LANGS) {
      for (const term of TERMS) {
        expect(MESSAGES[lang][nameKey(term.id)], `${lang} ${term.id} name`).toBeTruthy();
        expect(MESSAGES[lang][defKey(term.id)], `${lang} ${term.id} definition`).toBeTruthy();
        if (exKey(term.id) in en) expect(MESSAGES[lang][exKey(term.id)], `${lang} ${term.id} example`).toBeTruthy();
      }
    }
  });

  it("has no entry text without a term, and no term twice", () => {
    const ids = new Set(TERMS.map((term) => term.id));
    expect(ids.size).toBe(TERMS.length);
    const orphans = Object.keys(en).filter((key) => key.startsWith("gl.")).map((key) => key.split(".")[1]).filter((id) => !ids.has(id));
    expect(orphans).toEqual([]);
  });

  it("translates every definition, not copies the English", () => {
    const copied = TERMS.filter((term) => MESSAGES.es[defKey(term.id)] === en[defKey(term.id)]).map((term) => term.id);
    expect(copied).toEqual([]);
  });

  it("explains every seat the table labels", () => {
    for (const seat of POSITIONS_9MAX) {
      expect(TOKEN_PATTERN.exec(seat)?.[1], seat).toBe(seat);
      expect(termById.get(tokenTerm(seat) ?? "")?.abbr).toBe(seat);
    }
  });

  it("links only to entries that exist, from coach rows and report stats that exist", () => {
    for (const id of [...Object.values(ROW_TERM), ...Object.values(STAT_TERM)]) expect(termById.has(id), id).toBe(true);
    for (const row of Object.keys(ROW_TERM)) expect(`coach.row.${row}` in en, row).toBe(true);
    const stats = Object.keys(en).filter((key) => key.startsWith("report.stat.")).map((key) => key.slice(12));
    expect(Object.keys(STAT_TERM).sort()).toEqual(stats.sort());
  });

  it("never links a hand, a number or part of a word", () => {
    for (const text of ["K8o", "45%", "COVERAGE", "BBQ", "UTG+1x", "CHECK"]) expect(TOKEN_PATTERN.test(text), text).toBe(false);
    expect("UTG+1 opens".split(TOKEN_PATTERN)).toEqual(["", "UTG+1", " opens"]);
  });

  it("says push/fold equilibrium, never Nash, and links it in each language (the owner, 27 Oct)", () => {
    for (const lang of LANGS) {
      expect(Object.values(MESSAGES[lang]).filter((text) => /nash/i.test(text)), lang).toEqual([]);
      const reason = MESSAGES[lang]["coach.reason.sb_shove_in"];
      const linked = reason.split(TOKEN_PATTERN).filter((_, i) => i % 2 === 1).map(tokenTerm);
      expect(linked, lang).toEqual(["SB", "BB", "pushFold"]);
    }
  });
});

describe("the coach's terms at the table", () => {
  it("makes CO in the reason tappable: a definition opens, then the glossary entry", () => {
    atTable();
    const co = within(screen.getByTestId("coach-panel")).getByTestId("gl-term-CO");
    expect(co).toHaveTextContent("CO");
    expect(screen.getByTestId("coach-panel")).toHaveTextContent("Q8o is not in the CO open range.");
    fireEvent.click(co);
    expect(co).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("gl-pop")).toHaveTextContent("CO · Cutoff");
    expect(screen.getByTestId("gl-pop")).toHaveTextContent(en["gl.CO.def"]);
    fireEvent.click(screen.getByTestId("gl-pop-open"));
    expect(screen.getByTestId("glossary-page")).toBeInTheDocument();
    expect(screen.getByTestId("glossary-entry-CO")).toHaveClass("glossary-focus");
  });

  it("closes the definition with Escape, a second tap or a tap elsewhere", () => {
    atTable();
    const co = screen.getByTestId("gl-term-CO");
    fireEvent.click(co);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("gl-pop")).toBeNull();
    fireEvent.click(co);
    fireEvent.click(co);
    expect(screen.queryByTestId("gl-pop")).toBeNull();
    fireEvent.click(co);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId("gl-pop")).toBeNull();
  });

  it("links the factor rows the glossary explains, and not the others", () => {
    atTable();
    expect(screen.getByTestId("gl-term-spr")).toHaveTextContent("SPR");
    expect(screen.getByTestId("gl-term-potOdds")).toHaveTextContent("POT ODDS");
    expect(screen.queryByText("ACTION")?.closest("button")).toBeNull();
  });

  it("works in Spanish, on the phone's coach card too", () => {
    render(
      <I18nProvider initial="es">
        <MemoryRouter><MobileCoachCard coach={COACH} /></MemoryRouter>
      </I18nProvider>,
    );
    expect(screen.getByTestId("mobile-coach")).toHaveTextContent("Q8o no está en el rango de apertura de CO.");
    fireEvent.click(screen.getByTestId("gl-term-CO"));
    expect(screen.getByTestId("gl-pop")).toHaveTextContent(MESSAGES.es["gl.CO.def"]);
    expect(screen.getByTestId("gl-pop-open")).toHaveTextContent("Abrir en el glosario");
  });
});

describe("the glossary page", () => {
  it("lists every term by group", () => {
    glossaryAt("/glossary");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("GLOSSARY");
    for (const term of TERMS) expect(screen.getByTestId(`glossary-entry-${term.id}`)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(screen.getByTestId("glossary-entry-vpip")).toHaveTextContent(`Example: ${en["gl.vpip.ex"]}`);
  });

  it("opens on the entry asked for", () => {
    glossaryAt("/glossary?term=spr");
    expect(screen.getByTestId("glossary-entry-spr")).toHaveClass("glossary-focus");
    expect(screen.getByTestId("glossary-entry-CO")).not.toHaveClass("glossary-focus");
  });

  it("finds terms by abbreviation or words, accents optional, and says when none match", () => {
    glossaryAt("/glossary", "es");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("GLOSARIO");
    const search = screen.getByTestId("glossary-search");
    fireEvent.change(search, { target: { value: "posicion media" } });
    expect(screen.getByTestId("glossary-entry-MP")).toBeInTheDocument();
    expect(screen.queryByTestId("glossary-entry-CO")).toBeNull();
    fireEvent.change(search, { target: { value: "vpip" } });
    expect(screen.getByTestId("glossary-entry-vpip")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByTestId("glossary-none")).toHaveTextContent("Ningún término coincide con \"zzz\".");
  });

  it("is a STUDY card in the home menu", () => {
    render(<MemoryRouter><HomeMenu isAdmin={false} /></MemoryRouter>);
    const study = screen.getByRole("region", { name: "STUDY" });
    expect(within(study).getByTestId("menu-glossary")).toHaveTextContent("Glossary");
  });
});

describe("the report's stats", () => {
  it("open their glossary entry", () => {
    render(
      <MemoryRouter>
        <PlayerStats stats={[{ key: "vpip", hits: 0, chances: 40, value: 31.5, low: 18, high: 26 }]} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("gl-term-vpip"));
    expect(screen.getByTestId("gl-pop")).toHaveTextContent(en["gl.vpip.def"]);
  });
});
