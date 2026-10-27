"use client";
import { Input } from "./ui";

// Common choices offered while typing; any wording can still be entered, because the prescriber's own
// directions always come first.
export const FREQUENCIES = ["Once daily", "Twice daily", "3 times daily", "4 times daily", "Every 8 hours", "Every 6 hours", "At night", "In the morning", "When needed", "Before meals", "After meals"];
export const DURATIONS = ["1 day", "3 days", "5 days", "7 days", "10 days", "14 days", "30 days", "Until finished", "Ongoing"];
export const DOSES = ["1 tablet", "2 tablets", "1 capsule", "2 capsules", "5 ml", "10 ml", "1 puff", "2 puffs"];

export function DirectionLists() {
  return (
    <>
      <datalist id="dir-doses">{DOSES.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dir-frequencies">{FREQUENCIES.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dir-durations">{DURATIONS.map((v) => <option key={v} value={v} />)}</datalist>
    </>
  );
}

// Dose, how often and how long for one medicine. Render <DirectionLists /> once on the page.
export function DirectionInputs({ value, onChange, labels }: { value: { dose?: string; frequency?: string; duration?: string }; onChange: (patch: { dose?: string; frequency?: string; duration?: string }) => void; labels?: boolean }) {
  return (
    <>
      <Input label={labels ? "Dose" : undefined} aria-label="Dose" list="dir-doses" placeholder="Dose" value={value.dose || ""} onChange={(e) => onChange({ dose: e.target.value })} />
      <Input label={labels ? "How often" : undefined} aria-label="How often" list="dir-frequencies" placeholder="How often" value={value.frequency || ""} onChange={(e) => onChange({ frequency: e.target.value })} />
      <Input label={labels ? "How long" : undefined} aria-label="How long" list="dir-durations" placeholder="How long" value={value.duration || ""} onChange={(e) => onChange({ duration: e.target.value })} />
    </>
  );
}
