/* The /app navigation model: shared by the app's sidebar and the homepage
   demo window, so both always show the same labels and icons. */

export type NavItem = { label: string; href: string; icon: React.ReactNode };


const ICON_STROKE = { stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

export const icons = {
  accounts: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.2" />
    </svg>
  ),
  send: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <path d="M14 2 7.5 8.5" />
      <path d="M14 2 9.8 14l-2.3-5.5L2 6.2 14 2Z" />
    </svg>
  ),
  wallet: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <rect x="1.5" y="3.5" width="13" height="9.5" rx="2" />
      <path d="M10.5 8.25h2.5" />
      <path d="M1.5 6h13" />
    </svg>
  ),
  cards: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <rect x="1.5" y="3" width="13" height="10" rx="1.8" />
      <path d="M1.5 6.2h13" />
      <path d="M4 10.5h3" />
    </svg>
  ),
  agents: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <rect x="3.5" y="3.5" width="9" height="9" rx="1.6" />
      <path d="M6 1v2.5M10 1v2.5M6 12.5V15M10 12.5V15M1 6h2.5M1 10h2.5M12.5 6H15M12.5 10H15" />
    </svg>
  ),
  activity: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <path d="M1.5 8h3l2-4.5 3 9 2-4.5h3" />
    </svg>
  ),
  analytics: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <path d="M2 14V9M6 14V5M10 14V7.5M14 14V3" />
    </svg>
  ),
  keys: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <circle cx="5" cy="8" r="3.2" />
      <path d="M8.2 8H14.5M12.5 8v2.4M10.4 8v1.7" />
    </svg>
  ),
  alerts: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <path d="M8 2a4.2 4.2 0 0 0-4.2 4.2c0 3-1.3 4.3-1.3 4.3h11s-1.3-1.3-1.3-4.3A4.2 4.2 0 0 0 8 2Z" />
      <path d="M6.6 13a1.6 1.6 0 0 0 2.8 0" />
    </svg>
  ),
  status: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M4.5 8h2l1-2.2 1.6 4.4 1-2.2h1.9" />
    </svg>
  ),
  settings: (
    <svg width="15" height="15" viewBox="0 0 16 16" {...ICON_STROKE}>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M13.2 9.9a5.6 5.6 0 0 0 0-3.8l1.3-1-1.3-2.2-1.6.5a5.6 5.6 0 0 0-3.3-1.9L8 0h0L7.7 1.5a5.6 5.6 0 0 0-3.3 1.9l-1.6-.5-1.3 2.2 1.3 1a5.6 5.6 0 0 0 0 3.8l-1.3 1 1.3 2.2 1.6-.5a5.6 5.6 0 0 0 3.3 1.9L8 16l.3-1.5a5.6 5.6 0 0 0 3.3-1.9l1.6.5 1.3-2.2-1.3-1Z" />
    </svg>
  ),
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Banking",
    items: [
      { label: "Accounts", href: "/app", icon: icons.accounts },
      { label: "Send Payment", href: "/app/run", icon: icons.send },
      { label: "Cards", href: "/app/cards", icon: icons.cards },
      { label: "Wallet", href: "/app/wallet", icon: icons.wallet },
    ],
  },
  {
    label: "Agents",
    items: [
      { label: "Agent Accounts", href: "/app/dashboard", icon: icons.agents },
      { label: "Activity", href: "/app/executions", icon: icons.activity },
      { label: "Analytics", href: "/app/analytics", icon: icons.analytics },
    ],
  },
  {
    label: "Developer",
    items: [
      { label: "API Keys", href: "/app/keys", icon: icons.keys },
      { label: "Alerts", href: "/app/alerts", icon: icons.alerts },
      { label: "Status", href: "/status", icon: icons.status },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { label: "Settings", href: "/app/settings", icon: icons.settings };
