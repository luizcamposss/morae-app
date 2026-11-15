// In-app tutorial (#222): the platform tour of each role, in chapters, and short tips per screen.
export type Guides = {
  showTips: boolean;
  // "tour:admin-finance", "tip:admin-finance-accounts".
  seen: string[];
};

// Where a step points. "nav:/admin/finance" = a menu entry (skipped when the user doesn't have
// it); "text:Unidade" = a field, tab, button or heading with that text (inside the open window,
// when there is one); anything else = a `data-tour` element. Missing elements skip the step.
export type GuideStep = {
  title: string;
  body: string;
  // A menu entry to highlight ("/admin/finance"). Skipped when the user doesn't have it in the menu.
  nav?: string;
  target?: string;
  // Screen to open before the step.
  path?: string;
  // Button to click before the step (opens a window to explain its fields). Nothing is saved:
  // the guide closes the window when it moves on.
  open?: string;
};

export type Guide = {
  key: string;
  // Chapter name ("Financeiro"); screen tips have none.
  title?: string;
  steps: GuideStep[];
};

// A chapter as Ajustes lists it.
export type ChapterInfo = { key: string; title: string; count: number; seen: boolean };
