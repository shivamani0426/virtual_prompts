import { AlertCircle, ArrowUpRight, BookOpenCheck, Bot, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { BrowserVoice } from "./BrowserVoice";
import { t } from "../language/locale";
import type { Locale } from "../language/locale";
import type { FormEvent } from "react";
import { askEvidenceAssistant } from "../../lib/api";
import type { AssistantAnswer } from "../../lib/api";

const SUGGESTIONS = [
  "What does WHO recommend for PM2.5?",
  "How is CPCB AQI different from US AQI?",
  "What helps reduce indoor smoke?",
  "Who is more sensitive to air pollution?",
];

type Message = { id: number; question: string; response: AssistantAnswer };

function officialLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (parsed.protocol !== "https:") return null;
    if (host === "www.who.int" || host === "airquality.cpcb.gov.in") return url;
  } catch {
    // No user-supplied URL is allowed as a citation target.
  }
  return null;
}

export function TrustedAssistant({locale="en"}:{locale?:Locale}) {
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const countRef = useRef(0);

  async function ask(question: string) {
    const value = question.trim();
    if (busy || value.length < 5 || value.length > 400) {
      setError("Ask a question between 5 and 400 characters.");
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setError("");
    setBusy(true);
    try {
      const result = await askEvidenceAssistant(value, controller.signal);
      countRef.current += 1;
      setHistory((current) => [...current.slice(-3), {
        id: countRef.current,
        question: value,
        response: result,
      }]);
      setDraft("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The evidence assistant is unavailable.");
    } finally {
      setBusy(false);
      requestRef.current = null;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <section id="assistant" className="trusted-ai-section" aria-labelledby="trusted-ai-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">03 / YOUR EVIDENCE ASSISTANT</p>
          <h2 id="trusted-ai-title">Ask about the air. Check the source.</h2>
          <p>Reviewed WHO and CPCB references, linked citations and honest uncertainty.</p>
        </div>
        <span className="plan-badge"><BookOpenCheck size={16} aria-hidden="true"/> Source grounded</span>
      </div>
      <div className="assistant-shell">
        <div className="assistant-banner">
          <span className="assistant-banner-mark"><Bot size={28} aria-hidden="true"/></span>
          <div>
            <strong>Evidence first. AI second.</strong>
            <p>
              This assistant only answers questions supported by our reviewed WHO/CPCB source
              registry. It does not use your location, medical history or live AQI, and it
              cannot tell whether your street is safe right now.
            </p>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="assistant-empty">
            <Sparkles size={24} aria-hidden="true"/>
            <h3>What would you like to understand?</h3>
            <p>Choose an example or write your own question. We&apos;ll show the evidence alongside each answer.</p>
            <div className="assistant-examples">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" disabled={busy} onClick={() => void ask(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="assistant-history" aria-live="polite">
            {history.map((message) => (
              <article key={message.id} className="assistant-exchange">
                <div className="assistant-question"><strong>You asked</strong><p>{message.question}</p></div>
                <div className="assistant-answer">
                  <span className="assistant-answer-mode">
                    <ShieldCheck size={16} aria-hidden="true" />
                    {message.response.mode === "generated"
                      ? "AI paraphrase — review the cited facts"
                      : message.response.mode === "evidence_only"
                        ? "Reviewed source summaries — no generated answer"
                        : message.response.mode === "urgent_safety"
                          ? "Urgent safety information"
                          : "Not verified — the assistant abstained"}
                  </span>
                  <p className="assistant-answer-body">{message.response.answer}</p>
                  {message.response.citations.length > 0 && (
                    <div className="assistant-citations">
                      <p><BookOpenCheck size={15} aria-hidden="true"/> Sources used</p>
                      <ol>
                        {message.response.citations.map((source) => (
                          <li key={source.id}>
                            <strong>{source.publisher}</strong>
                            <span>{source.section} · {source.title}</span>
                            <small>Published {source.published} · Registry checked {source.verified}</small>
                            <span className="assistant-reviewed-evidence">
                              <strong>Evidence used:</strong> {source.reviewed_summary}
                            </span>
                            {officialLink(source.url) && (
                              <a href={officialLink(source.url)!} target="_blank" rel="noopener noreferrer">
                                Read official source <ArrowUpRight size={14} aria-hidden="true"/>
                              </a>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {message.response.limitations.map((limitation, index) => (
                    <p className="assistant-limitation" key={index}>
                      <AlertCircle size={14} aria-hidden="true"/>{limitation}
                    </p>
                  ))}
                  <p className="assistant-disclaimer">{message.response.disclaimer}</p>
                </div>
              </article>
            ))}
          </div>
        )}
        <form className="assistant-form" onSubmit={submit}>
          <label htmlFor="assistant-question" className="visually-hidden">{t(locale,"question")}</label>
          <BrowserVoice locale={locale} onTranscribe={setDraft} answer={history.at(-1)?.response.answer||""}/>
          <textarea
            id="assistant-question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about AQI scales, WHO guidance, indoor smoke, masks…"
            rows={2}
            maxLength={400}
            disabled={busy}
          />
          <div className="assistant-form-actions">
            <span>{draft.length}/400 · Each question is answered independently</span>
            <button type="submit" disabled={busy || draft.trim().length < 5}>
              {busy ? "Checking…" : t(locale,"ask")} <Send size={15} aria-hidden="true"/>
            </button>
          </div>
        </form>
        {error && <p className="assistant-error" role="alert">{error}</p>}
        <p className="assistant-privacy">
          <ShieldCheck size={15} aria-hidden="true"/> Answers are educational, not medical advice.
          Questions are processed by our API and may be sent to Cloudflare Workers AI for
          phrasing; please don&apos;t enter identifying or sensitive medical details. Recent
          questions remain only in this page&apos;s memory and disappear on reload.
        </p>
      </div>
    </section>
  );
}
