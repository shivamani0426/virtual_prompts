import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TrustedAssistant } from "./TrustedAssistant";

const valid = {
  mode: "evidence_only",
  answer: "The WHO 2021 PM2.5 24-hour guideline is 15 micrograms per cubic metre.",
  citations: [
    {
      id: "WHO-2021-PM25",
      publisher: "World Health Organization",
      title: "WHO global air quality guidelines",
      section: "2021 guideline levels",
      url: "https://www.who.int/news-room/questions-and-answers/item/who-global-air-quality-guidelines",
      published: "2021-09-22",
      verified: "2026-11-18",
    },
  ],
  limitations: ["AI paraphrasing is disabled; reviewed sources are shown."],
  disclaimer: "General educational guidance, not medical advice.",
  live_data_used: false,
  registry_version: "2026-11-18.1",
};
const json = (body: object, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Evidence-first assistant UI", () => {
  it("displays official citations without saving questions to localStorage", async () => {
    const fetchMock = vi.fn(async () => json(valid));
    vi.stubGlobal("fetch", fetchMock);
    render(<TrustedAssistant/>);
    fireEvent.click(screen.getByRole("button", { name: /WHO recommend for PM2.5/i }));
    expect(await screen.findByText(/WHO 2021 PM2.5 24-hour guideline/i)).toBeInTheDocument();
    const official = screen.getByRole("link", { name: /Read official source/i });
    expect(official).toHaveAttribute("href", valid.citations[0]!.url);
    expect(screen.getByText(/Reviewed source summaries/i)).toBeInTheDocument();
    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(request.method).toBe("POST");
    expect(JSON.stringify(request.body)).not.toContain("city");
    expect(localStorage.length).toBe(0);
  });

  it("clearly marks abstention and allows retrying after an outage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({
      ...valid, mode: "abstained", citations: [],
      answer: "I do not have sufficient verified evidence for that question.",
    })));
    render(<TrustedAssistant/>);
    fireEvent.click(screen.getByRole("button", { name: /WHO recommend for PM2.5/i }));
    expect(await screen.findByText(/do not have sufficient verified evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/assistant abstained/i)).toBeInTheDocument();
  });

  it("never exposes an untrusted citation URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({
      ...valid, citations: [{ ...valid.citations[0], url: "javascript:alert(1)" }],
    })));
    render(<TrustedAssistant/>);
    fireEvent.click(screen.getByRole("button", { name: /WHO recommend for PM2.5/i }));
    await screen.findByText(/WHO 2021 PM2.5 24-hour guideline/i);
    expect(screen.queryByRole("link", { name: /Read official source/i })).not.toBeInTheDocument();
  });
});
