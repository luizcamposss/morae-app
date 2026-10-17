import type { AssemblyItemOutcome, AssemblyPhase, AssemblyQuorum, AssemblyType, AssemblyVoteType, AssemblyVoterRule } from "./types";

export const ASSEMBLY_PHASE = { draft: 1, scheduled: 2, open: 3, closed: 4, canceled: 5 } as const satisfies Record<string, AssemblyPhase>;
export const VOTE_TYPE = { yesNo: 1, multipleChoice: 2 } as const satisfies Record<string, AssemblyVoteType>;
export const ITEM_OUTCOME = { approved: 1, rejected: 2, decided: 3, undecided: 4 } as const satisfies Record<string, AssemblyItemOutcome>;

export const phaseMeta: Record<AssemblyPhase, { label: string; tone: string }> = {
  1: { label: "Rascunho", tone: "bg-campo text-tinta-suave" },
  2: { label: "Agendada", tone: "bg-ambar-suave text-ambar" },
  3: { label: "Votação aberta", tone: "bg-verde-suave text-verde-tinta" },
  4: { label: "Encerrada", tone: "bg-menu text-tinta" },
  5: { label: "Cancelada", tone: "bg-vermelho-suave text-vermelho" },
};

export const assemblyTypes: Array<{ value: AssemblyType; label: string; hint: string }> = [
  { value: 1, label: "Ordinária", hint: "A anual: contas, orçamento, síndico" },
  { value: 2, label: "Extraordinária", hint: "Assuntos urgentes ou fora do calendário" },
];

export const voterRules: Array<{ value: AssemblyVoterRule; label: string; hint: string }> = [
  { value: 1, label: "Só proprietários", hint: "Um voto por unidade, do dono" },
  { value: 2, label: "Proprietários e moradores", hint: "Quem mora também pode votar pela unidade" },
];

export const voteTypes: Array<{ value: AssemblyVoteType; label: string }> = [
  { value: 1, label: "Sim ou não" },
  { value: 2, label: "Múltipla escolha" },
];

export const quorums: Array<{ value: AssemblyQuorum; label: string; short: string }> = [
  { value: 1, label: "Maioria dos votos", short: "maioria dos votos" },
  { value: 2, label: "Maioria absoluta das unidades", short: "metade + 1 das unidades" },
  { value: 3, label: "Dois terços das unidades", short: "2/3 das unidades" },
  { value: 4, label: "Unanimidade", short: "todas as unidades" },
];

export const outcomeMeta: Record<AssemblyItemOutcome, { label: string; tone: string }> = {
  1: { label: "Aprovada", tone: "bg-verde-suave text-verde-tinta" },
  2: { label: "Rejeitada", tone: "bg-vermelho-suave text-vermelho" },
  3: { label: "Decidida", tone: "bg-verde-suave text-verde-tinta" },
  4: { label: "Sem decisão", tone: "bg-ambar-suave text-ambar" },
};

export function assemblyTypeLabel(type: AssemblyType) {
  return assemblyTypes.find((item) => item.value === type)?.label ?? "";
}

export function voterRuleLabel(rule: AssemblyVoterRule) {
  return voterRules.find((item) => item.value === rule)?.label ?? "";
}

export function quorumLabel(quorum: AssemblyQuorum) {
  return quorums.find((item) => item.value === quorum)?.label ?? "";
}

// Share of the eligible units that already voted, from 0 to 100.
export function participationPercent(voted: number, eligible: number) {
  return eligible > 0 ? Math.round((voted / eligible) * 100) : 0;
}
