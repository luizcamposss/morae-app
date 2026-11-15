import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { useMenuItems } from "../../shared/layout/useMenuItems";
import { GuideContext, type GuideContextValue } from "./GuideContext";
import { updateGuides } from "./guideService";
import { Spotlight } from "./Spotlight";
import { tipFor, tipKey } from "./tips";
import { tours } from "./tours";
import type { Guide, GuideStep, Guides } from "./types";

// How long a step waits for its element (a screen still loading) before it is skipped.
const WAIT_MS = 3000;
const TIP_WAIT_MS = 1500;

type Active = { guide: Guide; steps: GuideStep[]; index: number; direction: 1 | -1; isTip: boolean };
type Resolved = { index: number; target: HTMLElement | null; note: string };

function isVisible(element: Element) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
}

function topDialog() {
  const open = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
  return open.length ? open[open.length - 1] : null;
}

const normalize = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");

// "text:Unidade": the field, tab, button or heading with that text, in the open window if any.
function findByText(text: string) {
  const wanted = normalize(text);
  // The page itself (not the side menu), or the open window.
  const scope: ParentNode = topDialog() ?? document.querySelector("main") ?? document;
  const candidates = Array.from(scope.querySelectorAll<HTMLElement>("label, button, a, [role=tab], h2, h3, legend")).filter(
    (element) => isVisible(element) && !element.closest("[data-guide]"),
  );
  const found =
    candidates.find((element) => normalize(element.textContent) === wanted) ??
    candidates.find((element) => normalize(element.textContent).startsWith(wanted));
  if (!found) return null;
  // A field's label stands for the whole field (label + input); a heading for its section, when
  // the section fits on the screen.
  if (found.tagName === "LEGEND") return found.closest("fieldset") ?? found;
  if (found.tagName === "LABEL") {
    // Up to the box that also holds the input (some labels sit in a row of their own).
    let field: HTMLElement = found;
    for (let level = 0; level < 3 && field.parentElement; level++) {
      field = field.parentElement;
      if (field.querySelector("input, select, textarea, button, [role=radiogroup]")) break;
    }
    return field;
  }
  if (found.tagName === "H2" || found.tagName === "H3") {
    const section = found.closest("section");
    if (section && section.getBoundingClientRect().height < window.innerHeight * 0.6) return section;
  }
  return found;
}

function findTarget(target: string) {
  if (target.startsWith("text:")) return findByText(target.slice(5));
  // "css:main li button": the first visible match (e.g. the first card of a list).
  if (target.startsWith("css:")) return Array.from((topDialog() ?? document).querySelectorAll<HTMLElement>(target.slice(4))).find(isVisible) ?? null;
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)).find(isVisible) ?? null;
}

// Steps of screens the user doesn't have in the menu (module off, syndic access) are left out.
function canSee(step: GuideStep, menuPaths: Set<string>) {
  if (step.nav && !menuPaths.has(step.nav)) return false;
  if (step.path) return [...menuPaths].some((path) => step.path === path || step.path!.startsWith(`${path}/`));
  return true;
}

// Closes the window the guide opened (its "Fechar" button runs the screen's own close).
function closeTopDialog() {
  topDialog()?.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')?.click();
}

// Runs the tutorial: the role's tour (in chapters) on the first access or from Ajustes, and the
// screen tips; what was already seen stays in the user's account.
export function GuideProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { primaryRole, menuItems } = useMenuItems();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [guides, setGuides] = useState<Guides | null>(user?.guides ?? null);
  const [active, setActive] = useState<Active | null>(null);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const autoStarted = useRef(false);
  // The window the guide opened to show its fields (by which opener): closed when the guide moves on.
  const openedWindow = useRef<string | null>(null);
  // The screen where a chapter just ended: its tip would pop right after it.
  const tipSkippedOn = useRef<string | null>(null);
  // The step the guide already opened a screen for: landing elsewhere means the screen redirected
  // (no access), so the step is skipped instead of trying again.
  const navigatedFor = useRef<string | null>(null);
  // A string key keeps the set stable between renders (the menu list is rebuilt every render).
  const menuKey = menuItems.map((item) => item.to).join("|");
  const menuPaths = useMemo(() => new Set(menuKey.split("|")), [menuKey]);

  // The role's chapters with only the steps this user can see.
  const chapters = useMemo(
    () =>
      (tours[primaryRole] ?? [])
        .map((guide) => ({ ...guide, steps: guide.steps.filter((step) => canSee(step, menuPaths)) }))
        .filter((guide) => guide.steps.some((step) => step.nav || step.target)),
    [menuPaths, primaryRole],
  );
  const firstChapter = chapters[0] ?? null;

  const save = useCallback(async (data: Parameters<typeof updateGuides>[0]) => {
    try {
      setGuides(await updateGuides(data));
    } catch {
      // Not worth an error on screen: at worst the tour shows again next time.
    }
  }, []);

  const start = useCallback((guide: Guide, isTip = false) => {
    if (!guide.steps.length) return;
    setResolved(null);
    setActive({ guide, steps: guide.steps, index: 0, direction: 1, isTip });
  }, []);

  // Closes what is showing and keeps it as seen (a tip can also turn the tips off).
  const finish = useCallback(
    (turnTipsOff = false) => {
      if (!active) return;
      if (openedWindow.current) {
        openedWindow.current = null;
        closeTopDialog();
      }
      if (!active.isTip) tipSkippedOn.current = pathname;
      setActive(null);
      setResolved(null);
      const key = active.guide.key;
      setGuides((current) => (current ? { showTips: turnTipsOff ? false : current.showTips, seen: [...new Set([...current.seen, key])] } : current));
      void save(turnTipsOff ? { markSeen: [key], showTips: false } : { markSeen: [key] });
    },
    [active, pathname, save],
  );

  const nextChapter = active && !active.isTip ? (chapters[chapters.findIndex((guide) => guide.key === active.guide.key) + 1] ?? null) : null;

  const move = useCallback(
    (direction: 1 | -1) => {
      if (!active) return;
      const index = active.index + direction;
      if (index < 0) return;
      if (index >= active.steps.length) {
        finish();
        if (nextChapter) start(nextChapter);
        return;
      }
      setActive({ ...active, index, direction });
    },
    [active, finish, nextChapter, start],
  );

  // A step that can't show (no access, element missing) gives way to the next one; past the
  // chapter's last step, the next chapter goes on.
  const skipTo = useCallback(
    (index: number) => {
      if (!active) return;
      if (index >= 0 && index < active.steps.length) return setActive({ ...active, index });
      finish();
      if (index >= active.steps.length && nextChapter) start(nextChapter);
    },
    [active, finish, nextChapter, start],
  );

  // Opens the step's screen (and window), then waits for its element; a missing one skips the step.
  const step = active?.steps[active.index];
  useEffect(() => {
    if (!active || !step) return;

    // Leaving the steps of a window the guide opened (or going to another one): close it.
    // Nothing was saved.
    let closing = false;
    if (openedWindow.current && step.open !== openedWindow.current) {
      openedWindow.current = null;
      closeTopDialog();
      closing = true;
    }
    if (step.path && pathname !== step.path) {
      const stepKey = `${active.guide.key}:${active.index}`;
      if (navigatedFor.current === stepKey) {
        navigatedFor.current = null;
        const skip = window.setTimeout(() => {
          const next = active.index + active.direction;
          skipTo(next);
        }, 0);
        return () => window.clearTimeout(skip);
      }
      navigatedFor.current = stepKey;
      navigate(step.path);
      return;
    }
    if (!step.nav && !step.target) return;

    const startedAt = Date.now();
    let clickedOpen = false;
    const timer = window.setInterval(() => {
      // The old window takes a moment to close.
      if (closing) {
        if (topDialog() && Date.now() - startedAt < 1000) return;
        closing = false;
      }
      // Opens the window once; if it doesn't open, the step times out like a missing element.
      if (step.open && !topDialog() && !clickedOpen) {
        const found = findTarget(step.open);
        // A `data-tour` wrapper (e.g. the page's action area): its first button opens the window.
        const opener = found && (found.matches("button, a") ? found : found.querySelector<HTMLElement>("button, a"));
        if (opener) {
          opener.click();
          clickedOpen = true;
          openedWindow.current = step.open;
          return;
        }
      }

      let target: HTMLElement | null = null;
      let note = "";
      if (step.nav) {
        target = findTarget(`nav:${step.nav}`);
        // On a phone, entries past the fourth live in "Mais".
        if (!target) {
          target = findTarget("nav:more");
          if (target) note = " No celular, fica em Mais.";
        }
      } else if (step.target) {
        target = findTarget(step.target);
      }

      if (target) {
        window.clearInterval(timer);
        setResolved({ index: active.index, target, note });
      } else if (Date.now() - startedAt > (active.isTip ? TIP_WAIT_MS : WAIT_MS)) {
        window.clearInterval(timer);
        const next = active.index + active.direction;
        skipTo(next);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, navigate, pathname, skipTo, step]);

  const tourSeen = !firstChapter || Boolean(guides?.seen.includes(firstChapter.key));

  // First access: the first chapter starts by itself on the home screen.
  useEffect(() => {
    if (autoStarted.current || !guides || tourSeen || !firstChapter || active || !pathname.endsWith("/dashboard")) return;
    const timer = window.setTimeout(() => {
      autoStarted.current = true;
      start(firstChapter);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [active, firstChapter, guides, pathname, start, tourSeen]);

  // Screen tips: once per screen, when the tips are on and nothing else is showing.
  useEffect(() => {
    if (!guides?.showTips || active || tipSkippedOn.current === pathname) return;
    // The first-access tour comes first on the home screen.
    if (!tourSeen && pathname.endsWith("/dashboard")) return;
    const key = tipKey(pathname);
    const steps = tipFor(pathname);
    if (!steps || guides.seen.includes(key)) return;
    const timer = window.setTimeout(() => start({ key, steps }, true), 700);
    return () => window.clearTimeout(timer);
  }, [active, guides, pathname, start, tourSeen]);

  const value = useMemo<GuideContextValue>(
    () => ({
      chapters: chapters.map((guide) => ({
        key: guide.key,
        title: guide.title ?? "",
        count: guide.steps.length,
        seen: Boolean(guides?.seen.includes(guide.key)),
      })),
      startChapter: (key) => {
        const guide = chapters.find((item) => item.key === key);
        if (guide) start(guide);
      },
      showTips: guides?.showTips ?? true,
      // Turning the tips back on shows them again from the start.
      setShowTips: (showTips) => save({ showTips, resetTips: showTips }),
    }),
    [chapters, guides, save, start],
  );

  // A step without an element (chapter opening, end) shows centered right away.
  const centered = Boolean(step && !step.nav && !step.target && (!step.path || pathname === step.path));
  const shown = active && (centered || resolved?.index === active.index) ? active.steps[active.index] : null;
  const shownTarget = centered ? null : (resolved?.target ?? null);
  const note = centered ? "" : (resolved?.note ?? "");
  // Inside an open window the balloon has to live in it (the rest of the page is inert).
  const host = shownTarget?.closest("dialog") ?? document.body;
  const chapterNumber = active && !active.isTip ? chapters.findIndex((guide) => guide.key === active.guide.key) + 1 : 0;

  return (
    <GuideContext.Provider value={value}>
      {children}
      {active && shown && (
        <Spotlight
          key={host === document.body ? "page" : "window"}
          host={host}
          target={shownTarget}
          overline={chapterNumber ? `Capítulo ${chapterNumber} de ${chapters.length} · ${active.guide.title}` : undefined}
          title={shown.title}
          body={shown.body + note}
          index={active.index}
          total={active.steps.length}
          onNext={() => move(1)}
          onBack={() => move(-1)}
          onClose={() => finish()}
          doneLabel={active.isTip ? "Entendi" : nextChapter ? `Seguir: ${nextChapter.title}` : "Concluir"}
          skip={active.isTip ? { label: "Não mostrar dicas", onClick: () => finish(true) } : undefined}
        />
      )}
    </GuideContext.Provider>
  );
}
