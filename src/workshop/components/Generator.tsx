import type { GeneratorViewState } from "../types";

interface GeneratorProps {
  generator: GeneratorViewState;
}

export function Generator({ generator }: GeneratorProps) {
  const hasReading = generator.visibleReading !== null;

  return (
    <section className="workshop-object workshop-generator" aria-label="Generator">
      <div className="object-symbol" aria-hidden="true">G</div>
      <strong>Generator</strong>
      {hasReading ? (
        <span>
          gauge {generator.visibleReading} / observed tick {generator.readingTick}
        </span>
      ) : (
        <span>gauge not observed</span>
      )}
    </section>
  );
}