// In-app tutorial (#tutorial): a tour per role and short tips per screen.
export type Guides = {
  showTips: boolean;
  // "tour:admin", "tip:admin-finance-accounts".
  seen: string[];
};

export type GuideStep = {
  title: string;
  body: string;
  // A menu entry to highlight ("/admin/finance"). Skipped when the user doesn't have it in the menu.
  nav?: string;
  // A `data-tour` element of the page; skipped when it doesn't show up.
  target?: string;
  // Screen to open before the step.
  path?: string;
};

export type Guide = {
  key: string;
  steps: GuideStep[];
};
