const PARTNERS = [
  "Solana",
  "Pyth",
  "USDG",
  "Squads",
  "Jupiter",
  "Kamino",
  "Anchor",
  "x402",
];

export function LogosBar() {
  return (
    <div
      style={{
        backgroundColor: "#15191A",
        padding: "44px 0 48px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="fx-overline"
        style={{
          textAlign: "center",
          color: "rgb(100, 105, 115)",
          letterSpacing: "0.24em",
          marginBottom: "28px",
        }}
      >
        Powering the agent economy
      </div>

      {/* Seamless marquee: the track renders the partner list twice and
          scrolls by exactly half its width per loop. */}
      <div
        style={{
          overflow: "hidden",
          maskImage:
            "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div className="fx-marquee">
          {[...PARTNERS, ...PARTNERS].map((name, i) => (
            <span
              key={`${name}-${i}`}
              style={{
                color: "rgba(247,248,248,0.55)",
                fontSize: "16px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
