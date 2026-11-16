"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CardNetwork, VirtualCard } from "@/lib/supabase/database.types";
import { EmptyState, Field, Notice, Page, PageHeader, Panel, PanelHeader } from "@/components/app/ui";

/* ── Card number generation (Luhn-valid demo numbers, not issued) ─────────── */

function luhnCheckDigit(payload: number[]): number {
  const sum = payload
    .slice()
    .reverse()
    .reduce((acc, d, i) => {
      if (i % 2 === 0) {
        const doubled = d * 2;
        return acc + (doubled > 9 ? doubled - 9 : doubled);
      }
      return acc + d;
    }, 0);
  return (10 - (sum % 10)) % 10;
}

function generateCardNumber(network: CardNetwork): string {
  const digits: number[] =
    network === "visa" ? [4] : [5, 1 + Math.floor(Math.random() * 5)];
  while (digits.length < 15) digits.push(Math.floor(Math.random() * 10));
  digits.push(luhnCheckDigit(digits));
  return digits.join("");
}

function generateCvv(): string {
  return String(Math.floor(Math.random() * 1000)).padStart(3, "0");
}

function formatExpiry(month: number, year: number): string {
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

/* ── Virtual card visual ──────────────────────────────────────────────────────
   The face is the brand card artwork (/images/card-face-plain.png: card.png
   cropped to the card's edges, streak removed). Card details are drawn on top.
   Fixed pixel sizing, tuned for the 300-430px card widths the grid produces. */

/* Tiny caps label printed on the card face, imitating a real card. */
const faceLabel = "font-mono uppercase tracking-[0.14em] text-white/55";

function VirtualCardVisual({
  card,
  revealed,
}: {
  card: VirtualCard;
  revealed: boolean;
}) {
  const frozen = card.status === "frozen";

  return (
    <div
      className={`elev-lg relative flex aspect-[938/587] w-full max-w-[430px] flex-col overflow-hidden rounded-[16px] bg-[#14131f] bg-[length:100%_100%] bg-no-repeat px-5 pb-5 pt-[18px] transition-[filter,opacity] duration-200 ${
        frozen ? "opacity-75 grayscale" : ""
      }`}
      // The face is the brand card artwork (card.png cropped to its edges,
      // with the diagonal lavender streak removed so the card details stay
      // legible). The metal, chip and logo match card.png exactly.
      style={{ backgroundImage: "url(/images/card-face-plain.png)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className={`${faceLabel} text-[9px]`}>Debit · Virtual</span>
        {frozen && <span className="badge h-5 px-1.5 text-[11px] text-fg-body">Frozen</span>}
      </div>

      {/* Contactless mark, sitting just right of the chip printed in the artwork */}
      <svg
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
        className="absolute left-[26%] top-[44%] h-auto w-[17px] -translate-y-1/2"
      >
        <path
          d="M5 3.5C7.5 6.5 7.5 11.5 5 14.5M8.5 2C11.8 6 11.8 12 8.5 16M12 0.5c4 5 4 12 0 17"
          stroke="rgba(232,236,242,0.5)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>

      {/* Spacer: the chip and logo live in the artwork */}
      <div className="flex-1" />

      {/* Number: always masked to the last four digits, groups justified
          across the full card width */}
      <div className="t-mono t-num flex w-full justify-between text-[18px] tracking-[2px] text-fg">
        {["••••", "••••", "••••", card.card_number.slice(-4)].map((group, i) => (
          <span key={i}>{group}</span>
        ))}
      </div>

      {/* Bottom row: cardholder, expiry, cvv, network mark */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={`${faceLabel} text-[7.5px]`}>Cardholder</div>
          <div className="mt-[3px] truncate text-[12px] font-medium uppercase tracking-[0.06em] text-fg">
            {card.cardholder_name}
          </div>
        </div>
        <div className="shrink-0">
          <div className={`${faceLabel} text-[7.5px]`}>Expires</div>
          <div className="t-mono t-num mt-[3px] text-[12px] text-fg">{formatExpiry(card.expiry_month, card.expiry_year)}</div>
        </div>
        <div className="shrink-0">
          <div className={`${faceLabel} text-[7.5px]`}>CVV</div>
          <div className="t-mono t-num mt-[3px] text-[12px] text-fg">{revealed ? card.cvv : "•••"}</div>
        </div>
        <div className="flex shrink-0 items-center">
          {card.network === "mastercard" ? (
            <svg viewBox="0 0 38 24" aria-label="Mastercard" className="h-auto w-9">
              <circle cx="14" cy="12" r="9" fill="#EB001B" />
              <circle cx="24" cy="12" r="9" fill="#F79E1B" fillOpacity="0.9" />
              <path d="M19 4.6a9 9 0 0 1 0 14.8 9 9 0 0 1 0-14.8Z" fill="#F16522" />
            </svg>
          ) : (
            <span aria-label="Visa" className="text-[16px] font-extrabold italic tracking-[0.5px] text-fg">
              VISA
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function CardsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [holderName, setHolderName] = useState("");
  const [network, setNetwork] = useState<CardNetwork>("visa");
  const [createStatus, setCreateStatus] = useState<"idle" | "creating" | "error">("idle");
  const [createError, setCreateError] = useState("");

  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  async function fetchCards() {
    setLoading(true);
    setLoadError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [{ data: profile }, cardsRes] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
      supabase.from("virtual_cards").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (cardsRes.error) {
      setLoadError(
        `Could not load cards: ${cardsRes.error.message}. If the table is missing, apply supabase/migrations/0002_virtual_cards.sql.`
      );
      setCards([]);
    } else {
      setCards((cardsRes.data as VirtualCard[]) ?? []);
    }

    setHolderName((prev) => prev || profile?.display_name || "");
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCards();
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !holderName.trim()) return;
    setCreateStatus("creating");
    setCreateError("");

    const now = new Date();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("virtual_cards")
      .insert({
        profile_id: userId,
        cardholder_name: holderName.trim(),
        network,
        card_number: generateCardNumber(network),
        expiry_month: now.getMonth() + 1,
        expiry_year: now.getFullYear() + 4,
        cvv: generateCvv(),
      })
      .select()
      .single();

    if (error) {
      setCreateStatus("error");
      setCreateError(error.message);
      return;
    }

    setCards((prev) => [data as VirtualCard, ...prev]);
    setRevealedIds((prev) => new Set(prev).add((data as VirtualCard).id));
    setCreateStatus("idle");
  }

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleFreeze(card: VirtualCard) {
    const nextStatus = card.status === "frozen" ? "active" : "frozen";
    const supabase = createClient();
    const { error } = await supabase.from("virtual_cards").update({ status: nextStatus }).eq("id", card.id);
    if (!error) {
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: nextStatus } : c)));
    }
  }

  async function removeCard(card: VirtualCard) {
    if (!window.confirm(`Remove the ${card.network} card ending in ${card.card_number.slice(-4)}? This cannot be undone.`)) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("virtual_cards").delete().eq("id", card.id);
    if (!error) {
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    }
  }

  const creating = createStatus === "creating";

  return (
    <Page>
      <PageHeader
        title="Cards"
        description="Virtual debit cards backed by your primary account. Spend anywhere, reveal details only when you need them."
      />

      {loadError && (
        <Notice tone="danger" className="mb-4">
          {loadError}
        </Notice>
      )}

      {/* Generate form */}
      <Panel className="mb-6">
        <PanelHeader
          title="Generate a new card"
          description="Card numbers are generated instantly and can be frozen or removed at any time."
        />
        <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-3">
          <Field label="Cardholder name" htmlFor="card-holder" className="min-w-0 flex-[1_1_220px]">
            <input
              id="card-holder"
              className="input"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Name as it appears on the card"
              maxLength={26}
            />
          </Field>

          <div>
            <div className="field-label" id="card-network-label">
              Network
            </div>
            <div className="segmented h-10 items-center" role="group" aria-labelledby="card-network-label">
              {(["visa", "mastercard"] as CardNetwork[]).map((n) => {
                const active = network === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNetwork(n)}
                    aria-pressed={active}
                    className="inline-flex items-center gap-2"
                  >
                    {n === "visa" ? (
                      <span className="text-[12px] font-extrabold italic" aria-hidden="true">
                        VISA
                      </span>
                    ) : (
                      <svg width="24" height="15" viewBox="0 0 38 24" aria-hidden="true">
                        <circle cx="14" cy="12" r="9" fill="#EB001B" />
                        <circle cx="24" cy="12" r="9" fill="#F79E1B" fillOpacity="0.9" />
                      </svg>
                    )}
                    {n === "visa" ? "Visa" : "Mastercard"}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={creating || !holderName.trim()}>
            {creating ? "Generating..." : "Generate card"}
          </button>
        </form>
        {createStatus === "error" && (
          <Notice tone="danger" className="mt-3">
            {createError}
          </Notice>
        )}
      </Panel>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5" aria-busy="true" aria-label="Loading cards">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <div className="skeleton aspect-[1.586] w-full max-w-[430px] rounded-[18px]" />
              <div className="skeleton h-8 w-48" />
            </div>
          ))}
        </div>
      ) : cards.length === 0 && !loadError ? (
        <Panel padded={false}>
          <EmptyState
            title="No cards yet"
            description="Generate your first virtual card with the form above."
            action={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => document.getElementById("card-holder")?.focus()}
              >
                Generate a card
              </button>
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
          {cards.map((card) => {
            const last4 = card.card_number.slice(-4);
            return (
              <div key={card.id} className="veil-in flex flex-col gap-2.5">
                <VirtualCardVisual card={card} revealed={revealedIds.has(card.id)} />
                <div className="flex w-full max-w-[430px] flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => toggleReveal(card.id)}
                    aria-label={`${revealedIds.has(card.id) ? "Hide" : "Reveal"} CVV for card ending ${last4}`}
                  >
                    {revealedIds.has(card.id) ? "Hide CVV" : "Reveal CVV"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => toggleFreeze(card)}
                    aria-label={`${card.status === "frozen" ? "Unfreeze" : "Freeze"} card ending ${last4}`}
                  >
                    {card.status === "frozen" ? "Unfreeze" : "Freeze"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm ml-auto text-danger hover:text-danger"
                    onClick={() => removeCard(card)}
                    aria-label={`Remove card ending ${last4}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
