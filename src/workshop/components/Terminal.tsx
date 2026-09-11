interface TerminalProps {
  message: string | null;
}

export function Terminal({ message }: TerminalProps) {
  return (
    <section className="workshop-object workshop-terminal" aria-label="Terminal">
      <div className="object-symbol" aria-hidden="true">T</div>
      <strong>Terminal</strong>
      <span>{message ?? "..."}</span>
    </section>
  );
}