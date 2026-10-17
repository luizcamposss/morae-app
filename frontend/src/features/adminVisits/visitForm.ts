import { addDays } from "../visits/visitMeta";
import type { SaveVisitRequest, VisitResponse, VisitorType } from "../visits/types";

// Limits from VisitService.Validate.
export const NAME_MAX = 100;
export const COMPANY_MAX = 100;
export const NOTES_MAX = 500;
export const MAX_PERIOD_DAYS = 366;

export type VisitForm = {
  // Empty building = a visit of the condominium itself (no unit).
  buildingId: string;
  unitId: string;
  visitorName: string;
  visitorType: VisitorType;
  companyName: string;
  documentLastDigits: string;
  notes: string;
  startDate: string;
  isPeriod: boolean;
  endDate: string;
  daysOfWeek: number[];
  hasTime: boolean;
  startTime: string;
  endTime: string;
};

export type VisitFormErrors = Partial<Record<"unitId" | "visitorName" | "documentLastDigits" | "startDate" | "endDate" | "daysOfWeek" | "time", string>>;

export function toVisitForm(visit: VisitResponse | null, defaultDate: string): VisitForm {
  return {
    buildingId: visit?.buildingId ? String(visit.buildingId) : "",
    unitId: visit?.unitId ? String(visit.unitId) : "",
    visitorName: visit?.visitorName ?? "",
    visitorType: visit?.visitorType ?? 2,
    companyName: visit?.companyName ?? "",
    documentLastDigits: visit?.documentLastDigits ?? "",
    notes: visit?.notes ?? "",
    startDate: visit?.startDate ?? defaultDate,
    isPeriod: visit ? visit.startDate !== visit.endDate : false,
    endDate: visit && visit.startDate !== visit.endDate ? visit.endDate : "",
    daysOfWeek: visit?.daysOfWeek ?? [],
    hasTime: Boolean(visit?.startTime),
    startTime: visit?.startTime?.slice(0, 5) ?? "",
    endTime: visit?.endTime?.slice(0, 5) ?? "",
  };
}

// Same rules as the API, so most mistakes show next to the field before sending.
export function validateVisitForm(form: VisitForm, { isNew, today }: { isNew: boolean; today: string }): VisitFormErrors {
  const errors: VisitFormErrors = {};
  const name = form.visitorName.trim();
  const document = form.documentLastDigits.trim();

  if (form.buildingId && !form.unitId) errors.unitId = "Escolha a unidade ou deixe como visita do condomínio.";
  if (name.length < 2) errors.visitorName = "Informe o nome do visitante.";
  if (document && !/^[a-zA-Z0-9]{4}$/.test(document)) errors.documentLastDigits = "Informe só os 4 últimos dígitos.";

  if (!form.startDate) errors.startDate = "Informe a data da visita.";
  else if (isNew && form.startDate < today) errors.startDate = "A data não pode ser no passado.";

  if (form.isPeriod && form.startDate) {
    if (!form.endDate) errors.endDate = "Informe até quando.";
    else if (form.endDate < form.startDate) errors.endDate = "Precisa ser igual ou depois do início.";
    else if (form.endDate > addDays(form.startDate, MAX_PERIOD_DAYS - 1)) errors.endDate = "O período pode ter no máximo 1 ano.";
  }

  if (form.hasTime) {
    if (!form.startTime || !form.endTime) errors.time = "Informe o horário de início e de fim.";
    else if (form.endTime <= form.startTime) errors.time = "O fim precisa ser depois do início.";
  }

  return errors;
}

export function toVisitRequest(form: VisitForm): SaveVisitRequest {
  return {
    unitId: form.buildingId && form.unitId ? Number(form.unitId) : null,
    visitorName: form.visitorName.trim(),
    visitorType: form.visitorType,
    documentLastDigits: form.documentLastDigits.trim() || null,
    companyName: form.companyName.trim() || null,
    notes: form.notes.trim() || null,
    startDate: form.startDate,
    endDate: form.isPeriod ? form.endDate : null,
    daysOfWeek: form.isPeriod ? form.daysOfWeek : [],
    startTime: form.hasTime ? form.startTime : null,
    endTime: form.hasTime ? form.endTime : null,
  };
}
