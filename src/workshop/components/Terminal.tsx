interface TerminalProps { message: string | null }

export function Terminal({ message }: TerminalProps) {
  const hasMessage = message !== null && message !== "";
  return (
    <section className="workshop-terminal" data-message={hasMessage} aria-label="Terminal">
      <svg viewBox="0 0 260 235" aria-hidden="true" focusable="false">
        <ellipse cx="139" cy="216" rx="104" ry="12" fill="#0d1b20" opacity=".4" />
        <path d="M125 144H163V194H125Z" fill="#34494b" stroke="#647775" />
        <path d="M69 200L96 185H182L211 200V208H69Z" fill="#516662" stroke="#243d41" strokeWidth="2" />
        <path d="M31 41L49 27H216L233 42V145L215 158H31Z" fill="#293f42" stroke="#1a3037" strokeWidth="3" />
        <path d="M31 41L49 27H216L233 42Z" fill="#758982" opacity=".55" />
        <rect x="27" y="40" width="188" height="119" rx="10" fill="#586e68" stroke="#93a49a" strokeOpacity=".5" />
        <rect x="39" y="51" width="164" height="90" rx="7" fill="#172f32" stroke="#203b3d" strokeWidth="3" />
        <path d="M50 149H76M81 149H94" stroke="#a1b0a3" strokeWidth="2" strokeOpacity=".6" />
        <circle className="terminal-indicator" cx="194" cy="150" r="2.5" />
        <path d="M99 191H180M87 197H192" stroke="#82958a" strokeOpacity=".35" />
      </svg>
      <div className="terminal-screen" tabIndex={hasMessage ? 0 : undefined} role="region" aria-label="Terminal message">
        {hasMessage ? <p>{message}</p> : <><span className="terminal-rest" aria-hidden="true">_</span><span className="sr-only">No message supplied.</span></>}
      </div>
    </section>
  );
}
