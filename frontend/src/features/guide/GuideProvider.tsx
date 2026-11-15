import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { useMenuItems } from "../../shared/layout/useMenuItems";
import { GuideContext, type GuideContextValue } from "./GuideContext";
import { updateGuides } from "./guideService";
import { Spotlight } from "./Spotlight";
import { tours } from "./tours";
import type { Guide, GuideStep, Guides } from "./types";

// How long a step waits for its element (a screen still loading) before it is skipped.
const WAIT_MS = 3000;

type Active = { guide: Guide; steps: GuideStep[]; index: number; direction: 1 | -1 };
type Resolved = { index: number; target: HTMLElement | null; note: string };

function isVisible(element: Element) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
}

function findVisible(key: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)).find(isVisible) ?? null;
}

// Runs the tutorial: the role's tour on the first access (or from Ajustes) and keeps what was
// already seen in the user's account.
export function GuideProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { primaryRole, menuItems } = useMenuItems();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [guides, setGuides] = useState<Guides | null>(user?.guides ?? null);
  const [active, setActive] = useState<Active | null>(null);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const autoStarted = useRef(false);
  const tour = tours[primaryRole] ?? null;
  // A string key keeps the set stable between renders (the menu list is rebuilt every render).
  const menuKey = menuItems.map((item) => item.to).join("|");
  const menuPaths = useMemo(() => new Set(menuKey.split("|")), [menuKey]);

  const save = useCallback(async (data: Parameters<typeof updateGuides>[0]) => {
    try {
      setGuides(await updateGuides(data));
    } catch {
      // Not worth an error on screen: at worst the tour shows again next time.
    }
  }, []);

  const start = useCallback(
    (guide: Guide) => {
      const steps = guide.steps.filter((step) => !step.nav || menuPaths.has(step.nav));
      if (!steps.length) return;
      setResolved(null);
      setActive({ guide, steps, index: 0, direction: 1 });
    },
    [menuPaths],
  );

  const finish = useCallback(() => {
    if (!active) return;
    setActive(null);
    setResolved(null);
    setGuides((current) => (current ? { ...current, seen: [...new Set([...current.seen, active.guide.key])] } : current));
    void save({ markSeen: [active.guide.key] });
  }, [active, save]);

  const move = useCallback(
    (direction: 1 | -1) => {
      if (!active) return;
      const index = active.index + direction;
      if (index >= active.steps.length) return finish();
      if (index < 0) return;
      setActive({ ...active, index, direction });
    },
    [active, finish],
  );

  // Opens the step's screen and waits for its element; a missing element skips the step.
  const step = active?.steps[active.index];
  useEffect(() => {
    if (!active || !step) return;
    if (step.path && pathname !== step.path) {
      navigate(step.path);
      return;
    }
    if (!step.nav && !step.target) return;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      let target: HTMLElement | null = null;
      let note = "";
      if (step.nav) {
        target = findVisible(`nav:${step.nav}`);
        // On a phone, entries past the fourth live in "Mais".
        if (!target) {
          target = findVisible("nav:more");
          if (target) note = " No celular, fica em Mais.";
        }
      } else if (step.target) {
        target = findVisible(step.target);
      }

      if (target) {
        window.clearInterval(timer);
        setResolved({ index: active.index, target, note });
      } else if (Date.now() - startedAt > WAIT_MS) {
        window.clearInterval(timer);
        const next = active.index + active.direction;
        if (next >= active.steps.length || next < 0) finish();
        else setActive({ ...active, index: next });
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, finish, navigate, pathname, step]);

  // First access: the tour starts by itself on the home screen.
  useEffect(() => {
    if (autoStarted.current || !guides || !tour || active) return;
    if (guides.seen.includes(tour.key) || !pathname.endsWith("/dashboard")) return;
    const timer = window.setTimeout(() => {
      autoStarted.current = true;
      start(tour);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [active, guides, pathname, start, tour]);

  const value = useMemo<GuideContextValue>(
    () => ({
      startTour: () => {
        if (tour) start(tour);
      },
      hasTour: Boolean(tour),
      showTips: guides?.showTips ?? true,
      setShowTips: (showTips) => save({ showTips }),
      resetTips: () => save({ resetTips: true }),
    }),
    [guides?.showTips, save, start, tour],
  );

  // A step without an element (welcome, end) shows centered right away.
  const centered = Boolean(step && !step.nav && !step.target && (!step.path || pathname === step.path));
  const shown = active && (centered || resolved?.index === active.index) ? active.steps[active.index] : null;
  const shownTarget = centered ? null : (resolved?.target ?? null);
  const note = centered ? "" : (resolved?.note ?? "");

  return (
    <GuideContext.Provider value={value}>
      {children}
      {active && shown && (
        <Spotlight
          target={shownTarget}
          title={shown.title}
          body={shown.body + note}
          index={active.index}
          total={active.steps.length}
          onNext={() => move(1)}
          onBack={() => move(-1)}
          onClose={finish}
        />
      )}
    </GuideContext.Provider>
  );
}
