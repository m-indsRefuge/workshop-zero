import type { LampViewState } from "../types";

interface LampProps {
  lamp: LampViewState;
}

export function Lamp({ lamp }: LampProps) {
  return (
    <section
      className="workshop-object workshop-lamp"
      data-switched-on={lamp.switchedOn}
      data-lit={lamp.lit}
      aria-label={`Lamp ${lamp.lit ? "lit" : "dark"}`}
    >
      <div className="object-symbol" aria-hidden="true">L</div>
      <strong>Lamp</strong>
      <span>{lamp.lit ? "lit" : lamp.switchedOn ? "on / dark" : "off"}</span>
    </section>
  );
}