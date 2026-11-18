import { ArrowRight, HeartHandshake, HousePlus, Info, ShieldCheck, Sparkles } from "lucide-react";
import type { AirSnapshot, HouseholdPreferences } from "../../lib/types";
import { buildBriefing } from "./briefing";

export function DailyBriefing({
  air,
  preferences,
}: {
  air: AirSnapshot;
  preferences: HouseholdPreferences;
}) {
  const items = buildBriefing(air, preferences);

  return (
    <section className="briefing-section" id="briefing" aria-labelledby="briefing-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">02 / YOUR PERSONAL BRIEFING</p>
          <h2 id="briefing-title">Small steps for your day.</h2>
          <p>A practical plan shaped by the air outside and the household choices you&apos;ve shared.</p>
        </div>
        <span className="briefing-updated"><Sparkles size={16} aria-hidden="true" /> Based on US AQI {Math.round(air.current.us_aqi)}</span>
      </div>
      <div className="briefing-grid">
        {items.map((item, i) => (
          <article className={"briefing-card" + (i === 0 ? " briefing-primary" : "")} key={item.label}>
            <div className="briefing-number">{String(i + 1).padStart(2, "0")}</div>
            <div>
              <p>{item.label}</p>
              <h3>{item.message}</h3>
              {i === 0 && <span className="briefing-footnote">A little planning can make today easier.</span>}
            </div>
            {item.emphasis ? <ShieldCheck className="briefing-icon" size={22} aria-hidden="true" /> : <ArrowRight className="briefing-arrow" size={17} aria-hidden="true" />}
          </article>
        ))}
      </div>

      <div className="guidance-band">
        <div className="guidance-icon"><HeartHandshake size={22} aria-hidden="true" /></div>
        <div>
          <strong>Health guidance, not a diagnosis.</strong>
          <p>
            This is general information, not medical advice. Follow a clinician&apos;s care plan
            and local official warnings; seek urgent care for severe breathing symptoms.
          </p>
        </div>
        <a
          href="https://www.who.int/publications/i/item/9789240034228/"
          target="_blank"
          rel="noopener noreferrer"
        >
          WHO guidelines <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
      <div className="mini-explain">
        <HousePlus size={17} aria-hidden="true" />
        <span>Simple home changes, like reducing indoor smoke, support cleaner breathing spaces.</span>
        <Info size={15} aria-label="Advice is based on the general air-risk category, not indoor sensor measurements." />
      </div>
    </section>
  );
}
