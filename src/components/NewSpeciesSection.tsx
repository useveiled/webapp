export function NewSpeciesSection() {
  return (
    <div
      style={{
        backgroundColor: "#15191A",
        padding: "clamp(56px, 10vw, 96px) clamp(20px, 6vw, 96px)",
      }}
    >
      <div
        style={{
          maxWidth: "1392px",
          margin: "0 auto",
        }}
      >
        <div className="fx-overline" style={{ marginBottom: "24px" }}>
          01 / The Agent Economy
        </div>
        <h2
          style={{
            fontSize: "clamp(26px, 5vw, 48px)",
            fontWeight: 510,
            lineHeight: "1.2",
            letterSpacing: "-1.056px",
            color: "rgb(138, 143, 152)",
            margin: 0,
          }}
        >
          <strong
            style={{
              color: "rgb(247, 248, 248)",
              fontWeight: "inherit",
            }}
          >
            A new economic species has arrived.
          </strong>{" "}
          AI agents already earn, spend, and settle with one another around the
          clock. Veiled is the financial layer they run on: a non-custodial
          bank where humans and agents transact in confidence, and every
          settlement is verified on Solana.
        </h2>
      </div>
    </div>
  );
}
