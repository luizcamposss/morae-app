import { toAppDateTimeInput, todayInputDate } from "../../shared/lib/date";
import { VOTE_TYPE } from "../assemblies/assemblyMeta";
import type { AssemblyQuorum, AssemblyResponse, AssemblyType, AssemblyVoteType, AssemblyVoterRule, SaveAssemblyRequest } from "../assemblies/types";
import { addDays } from "../visits/visitMeta";

// Limits from AssemblyService.Validate.
export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 2000;
export const LOCATION_MAX = 200;
export const ITEM_TITLE_MAX = 200;
export const MAX_ITEMS = 30;
export const MAX_OPTIONS = 10;
export const OPTION_MAX = 200;

export type ItemForm = {
  // Local key only, so React keeps each card while items are added and removed.
  key: string;
  title: string;
  description: string;
  voteType: AssemblyVoteType;
  quorum: AssemblyQuorum;
  isSecret: boolean;
  options: string[];
};

export type AssemblyForm = {
  title: string;
  description: string;
  type: AssemblyType;
  voterRule: AssemblyVoterRule;
  hasMeeting: boolean;
  meetingAt: string;
  meetingLocation: string;
  votingStartsAt: string;
  votingEndsAt: string;
  items: ItemForm[];
};

export type AssemblyFormErrors = {
  title?: string;
  votingStartsAt?: string;
  votingEndsAt?: string;
  items?: string;
  // Per item, by its key.
  itemErrors?: Record<string, { title?: string; options?: string }>;
};

let nextKey = 0;
function newKey() {
  nextKey += 1;
  return `item-${nextKey}`;
}

export function newItemForm(): ItemForm {
  return { key: newKey(), title: "", description: "", voteType: VOTE_TYPE.yesNo, quorum: 1, isSecret: false, options: ["", ""] };
}

export function toAssemblyForm(assembly: AssemblyResponse | null): AssemblyForm {
  // New drafts start tomorrow at 8h and stay open for a week, until 20h.
  const tomorrow = addDays(todayInputDate(), 1);

  return {
    title: assembly?.title ?? "",
    description: assembly?.description ?? "",
    type: assembly?.type ?? 1,
    voterRule: assembly?.voterRule ?? 1,
    hasMeeting: Boolean(assembly?.meetingAt || assembly?.meetingLocation),
    meetingAt: toAppDateTimeInput(assembly?.meetingAt),
    meetingLocation: assembly?.meetingLocation ?? "",
    votingStartsAt: assembly ? toAppDateTimeInput(assembly.votingStartsAt) : `${tomorrow}T08:00`,
    votingEndsAt: assembly ? toAppDateTimeInput(assembly.votingEndsAt) : `${addDays(tomorrow, 7)}T20:00`,
    items: assembly?.items?.length
      ? assembly.items.map((item) => ({
          key: newKey(),
          title: item.title,
          description: item.description ?? "",
          voteType: item.voteType,
          quorum: item.quorum,
          isSecret: item.isSecret,
          options: item.voteType === VOTE_TYPE.multipleChoice ? item.options.filter((option) => !option.isAbstention).map((option) => option.text) : ["", ""],
        }))
      : [newItemForm()],
  };
}

// Same rules as the API, so most mistakes show next to the field before sending.
export function validateAssemblyForm(form: AssemblyForm): AssemblyFormErrors {
  const errors: AssemblyFormErrors = {};
  const itemErrors: NonNullable<AssemblyFormErrors["itemErrors"]> = {};

  if (!form.title.trim()) errors.title = "Informe o título da assembleia.";
  if (!form.votingStartsAt) errors.votingStartsAt = "Informe quando a votação abre.";
  if (!form.votingEndsAt) errors.votingEndsAt = "Informe quando a votação fecha.";
  else if (form.votingStartsAt) {
    const hours = (Date.parse(form.votingEndsAt) - Date.parse(form.votingStartsAt)) / 3_600_000;
    if (hours <= 0) errors.votingEndsAt = "O fim precisa ser depois do início.";
    else if (hours < 1) errors.votingEndsAt = "A votação precisa ficar aberta por pelo menos 1 hora.";
  }

  if (form.items.length === 0) errors.items = "Inclua pelo menos uma pauta.";

  for (const item of form.items) {
    const itemError: { title?: string; options?: string } = {};
    if (!item.title.trim()) itemError.title = "Informe o título da pauta.";

    if (item.voteType === VOTE_TYPE.multipleChoice) {
      const options = item.options.map((option) => option.trim());
      if (options.length < 2) itemError.options = "Use pelo menos 2 opções.";
      else if (options.some((option) => !option)) itemError.options = "Preencha todas as opções (ou remova as vazias).";
      else if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) itemError.options = "Há opções repetidas.";
    }

    if (itemError.title || itemError.options) itemErrors[item.key] = itemError;
  }

  if (Object.keys(itemErrors).length) errors.itemErrors = itemErrors;
  return errors;
}

export function hasFormErrors(errors: AssemblyFormErrors) {
  return Object.values(errors).some(Boolean);
}

export function toAssemblyRequest(form: AssemblyForm): SaveAssemblyRequest {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    type: form.type,
    voterRule: form.voterRule,
    meetingAt: form.hasMeeting && form.meetingAt ? form.meetingAt : null,
    meetingLocation: form.hasMeeting ? form.meetingLocation.trim() || null : null,
    votingStartsAt: form.votingStartsAt,
    votingEndsAt: form.votingEndsAt,
    items: form.items.map((item) => ({
      title: item.title.trim(),
      description: item.description.trim() || null,
      voteType: item.voteType,
      quorum: item.quorum,
      isSecret: item.isSecret,
      options: item.voteType === VOTE_TYPE.multipleChoice ? item.options.map((option) => option.trim()) : [],
    })),
  };
}
