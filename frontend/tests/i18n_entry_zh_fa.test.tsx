/* The entry screens in Simplified Chinese and Persian (plan 113 step 4):
 * sign-in, landing, tabs, appearance, home, plans, photo and profile. Drafts
 * for the community reviewers; neither language is READY yet. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "../src/components/LoginForm";
import { I18nProvider } from "../src/i18n/I18n";
import { LANG_KEY, type Lang } from "../src/i18n/lang";
import { en } from "../src/i18n/messages/en";
import { auth } from "../src/i18n/messages/en/auth";
import { home } from "../src/i18n/messages/en/home";
import { landing } from "../src/i18n/messages/en/landing";
import { plans } from "../src/i18n/messages/en/plans";
import { portrait } from "../src/i18n/messages/en/portrait";
import { portraitPrompt } from "../src/i18n/messages/en/portraitPrompt";
import { profile } from "../src/i18n/messages/en/profile";
import { tabs } from "../src/i18n/messages/en/tabs";
import { theme } from "../src/i18n/messages/en/theme";
import { MESSAGES } from "../src/i18n/translate";

const AREAS = { auth, landing, tabs, theme, home, plans, portrait, portraitPrompt, profile };
// names, the same in every language
const SAME = new Set(["plans.pro", "plans.sheet.title"]);

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("the entry screens in Chinese and Persian", () => {
  it.each(["zh", "fa"] as const)("translates every key of the nine areas in %s", (lang) => {
    for (const [area, keys] of Object.entries(AREAS)) {
      const left = (Object.keys(keys) as (keyof typeof en)[])
        .filter((key) => en[key].trim() && !SAME.has(key) && MESSAGES[lang][key] === en[key]);
      expect(left, `${lang} ${area}`).toEqual([]);
    }
  });

  it("keeps DELETE in Latin, since the account page compares what is typed", () => {
    for (const lang of ["zh", "fa"] as const) {
      expect(MESSAGES[lang]["account.typeDelete"]).toContain("DELETE");
      expect(MESSAGES[lang]["account.error.confirm"]).toContain("DELETE");
    }
  });

  it("writes the numbers inside Persian text in Persian digits", () => {
    expect(MESSAGES.fa["landing.hero.sub"]).toMatch(/۹.*۸/);
    const latinDigits = Object.values(AREAS).flatMap((keys) => Object.keys(keys) as (keyof typeof en)[])
      .filter((key) => /[0-9]/.test(MESSAGES.fa[key].replace(/\{\w+\}/g, "")));
    expect(latinDigits).toEqual([]);
  });

  it.each([
    ["zh", "登录", "邮箱或用户名", "还没有账号？", "请输入用户名。"],
    ["fa", "ورود", "ایمیل یا نام کاربری", "حساب نداری؟", "نام کاربری لازم است."],
  ] as const)("signs in in %s", (lang, submit, placeholder, noAccount, required) => {
    render(<I18nProvider initial={lang as Lang}><MemoryRouter><LoginForm onLogin={() => undefined} /></MemoryRouter></I18nProvider>);
    expect(screen.getByTestId("auth-submit")).toHaveTextContent(submit);
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
    expect(screen.getByText(noAccount)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("auth-submit"));
    expect(screen.getByText(required)).toBeInTheDocument();
  });

  it.each([
    ["zh", "掌握锦标赛决策", "锦标赛决策", "免费开始训练", "zh-Hans", "ltr"],
    ["fa", "در تصمیم‌های تورنمنت استاد شو", "تصمیم‌های تورنمنت", "تمرین رایگان را شروع کن", "fa", "rtl"],
  ] as const)("shows the landing page in %s, gold words and all", async (lang, heading, gold, start, htmlLang, dir) => {
    const { App } = await import("../src/App");
    localStorage.setItem(LANG_KEY, lang);
    window.location.hash = "#/";
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(heading);
    expect(screen.getByRole("heading", { level: 1 }).querySelector(".lm-accent")).toHaveTextContent(gold);
    expect(screen.getByTestId("minimal-start")).toHaveTextContent(start);
    expect(document.documentElement).toHaveAttribute("lang", htmlLang);
    expect(document.documentElement).toHaveAttribute("dir", dir);
  });
});
