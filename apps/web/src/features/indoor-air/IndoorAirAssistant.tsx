import { ArrowUpRight, House, Info, ShieldCheck, Wind } from "lucide-react";
import type { HouseholdPreferences } from "../../lib/types";
import { indoorGuidance } from "./advice";

export function IndoorAirAssistant({
  preferences,
  aqi,
}: {
  preferences: HouseholdPreferences;
  aqi: number | null;
}) {
  const guidance = indoorGuidance(preferences, aqi);
  return (
    <section className="indoor-section" id="indoor-air" aria-labelledby="indoor-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">05 / CLEANER SPACES</p>
          <h2 id="indoor-title">Make your indoor air a priority.</h2>
          <p>Low-cost first steps, with optional upgrades tailored to your home and budget.</p>
        </div>
        <span className="indoor-tag"><House size={16} aria-hidden="true" /> Home advice</span>
      </div>
      <div className="indoor-intro">
        <div className="indoor-intro-icon"><Wind size={24} aria-hidden="true" /></div>
        <div>
          <strong>We are not measuring your indoor air.</strong>
          <p>
            Our AQI value is an outdoor model estimate. Indoor particle levels depend on your
            building, cooking, cleaning, ventilation and equipment. Never treat this as a room sensor.
          </p>
        </div>
      </div>
      <div className="indoor-grid">
        {guidance.map((item, index) => (
          <article key={item.id} className="indoor-tip">
            <div className="indoor-tip-head">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{item.budget}</span>
            </div>
            <h3>{item.headline}</h3>
            <p>{item.description}</p>
            <div className="indoor-tip-footer">
              <ShieldCheck size={15} aria-hidden="true" /> {item.benefit}
            </div>
          </article>
        ))}
      </div>
      <div className="indoor-bottom-note">
        <Info size={17} aria-hidden="true" />
        <p>
          Masks or respirators require a suitable fit and situation. Do not block legally required
          ventilation, and follow local official guidance during smoke events.
        </p>
        <a
          href="https://www.who.int/health-topics/air-pollution"
          target="_blank"
          rel="noopener noreferrer"
        >WHO air pollution guidance <ArrowUpRight size={15} aria-hidden="true" /></a>
      </div>
    </section>
  );
}
