import { RotateCcw, ShieldCheck, UsersRound, Wallet } from "lucide-react";
import type { HouseholdPreferences } from "../../lib/types";
import { defaultPreferences } from "../../lib/preferences";

type Props = {
  value: HouseholdPreferences;
  onChange: (next: HouseholdPreferences) => void;
};

export function HouseholdSettings({ value, onChange }: Props) {
  function update<Key extends keyof HouseholdPreferences>(
    key: Key,
    next: HouseholdPreferences[Key],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <section className="household-section" id="household" aria-labelledby="household-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">03 / MAKE IT YOURS</p>
          <h2 id="household-title">A little about your household.</h2>
          <p>Choose only what you&apos;re comfortable sharing. These settings stay in this browser.</p>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => onChange(defaultPreferences)}
        >
          <RotateCcw size={16} aria-hidden="true" /> Reset choices
        </button>
      </div>
      <div className="household-layout">
        <fieldset className="preference-group">
          <legend><UsersRound size={20} aria-hidden="true" /> Who are we looking after?</legend>
          <label className="pref-check">
            <input
              type="checkbox"
              checked={value.children}
              onChange={(event) => update("children", event.target.checked)}
            />
            <span>Children</span>
            <small>Extra outdoor play guidance</small>
          </label>
          <label className="pref-check">
            <input
              type="checkbox"
              checked={value.olderAdults}
              onChange={(event) => update("olderAdults", event.target.checked)}
            />
            <span>Older adults</span>
            <small>Daily walking and activity tips</small>
          </label>
          <label className="pref-check">
            <input
              type="checkbox"
              checked={value.breathingSensitive}
              onChange={(event) => update("breathingSensitive", event.target.checked)}
            />
            <span>Breathing sensitivities</span>
            <small>No diagnoses or medical history required</small>
          </label>
        </fieldset>

        <div className="preference-selects">
          <label>
            <span>Usual commute</span>
            <select
              value={value.commute}
              onChange={(event) => update("commute", event.target.value as HouseholdPreferences["commute"])}
            >
              <option value="public">Bus / metro / shared transport</option>
              <option value="car">Personal car</option>
              <option value="two-wheeler">Two-wheeler</option>
              <option value="walk">Walk / cycle</option>
              <option value="home">Work or study from home</option>
            </select>
          </label>
          <label>
            <span>Home type</span>
            <select
              value={value.home}
              onChange={(event) => update("home", event.target.value as HouseholdPreferences["home"])}
            >
              <option value="apartment">Apartment</option>
              <option value="independent">Independent house</option>
              <option value="shared">Shared accommodation</option>
            </select>
          </label>
          <label>
            <span><Wallet size={16} aria-hidden="true" /> Budget for cleaner-air changes</span>
            <select
              value={value.budget}
              onChange={(event) => update("budget", event.target.value as HouseholdPreferences["budget"])}
            >
              <option value="low">Low — free and affordable ideas</option>
              <option value="medium">Medium — a few upgrades</option>
              <option value="high">Higher — equipment options</option>
            </select>
          </label>
        </div>
      </div>
      <div className="privacy-note">
        <ShieldCheck size={19} aria-hidden="true" />
        <p>
          <strong>Private by design:</strong> Your selections are stored in this browser and used
          locally to write your briefing. We do not send these household details to the AQI provider
          or to an AI service in this milestone. Avoid using a shared computer for sensitive choices.
        </p>
      </div>
    </section>
  );
}
