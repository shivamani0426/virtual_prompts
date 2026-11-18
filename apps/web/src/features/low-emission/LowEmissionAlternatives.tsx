import { ArrowUpRight, Bus, Leaf, MoveRight, ShieldCheck } from "lucide-react";
import type { HouseholdPreferences } from "../../lib/types";
import { lowEmissionOptions } from "./options";

export function LowEmissionAlternatives({
  preferences,
  aqi,
}: {
  preferences: HouseholdPreferences;
  aqi: number | null;
}) {
  const options = lowEmissionOptions(preferences, aqi);
  return (
    <section className="alternatives-section" id="low-emission" aria-labelledby="alternatives-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">04 / GENTLER CHOICES</p>
          <h2 id="alternatives-title">Move smarter. Waste a little less.</h2>
          <p>Alternatives that can reduce some emissions, without inventing CO₂ savings.</p>
        </div>
        <span className="indoor-tag"><Bus size={16} aria-hidden="true" /> Travel &amp; energy</span>
      </div>
      <div className="alternatives-grid">
        {options.map((option, index) => (
          <article className="alternative-card" key={option.id}>
            <div className="alternative-heading">
              <span className="alternative-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="alternative-cost">{option.cost}</span>
            </div>
            <div className="alternative-illustration">
              {option.benefit === "Personal exposure precaution" ? (
                <ShieldCheck size={24} aria-hidden="true" />
              ) : (
                <Leaf size={24} aria-hidden="true" />
              )}
            </div>
            <h3>{option.title}</h3>
            <p>{option.explanation}</p>
            <div className="alternative-footer">
              <MoveRight size={16} aria-hidden="true" />
              {option.benefit}
            </div>
          </article>
        ))}
      </div>
      <p className="alternative-disclaimer">
        <ArrowUpRight size={15} aria-hidden="true" />
        Fewer emissions and lower exposure are different goals. Actual benefits depend on distance,
        vehicle, building, and local conditions. We do not calculate unverified savings.
      </p>
    </section>
  );
}
