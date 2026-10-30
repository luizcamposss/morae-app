import type { OccurrencePriority, OccurrenceType } from "../occurrences/types";

// Limits from OccurrenceService and CreateOccurrenceDto.
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 1000;
export const PHOTO_ACCEPT = "image/jpeg,image/png";

export type OccurrenceForm = {
  unitId: string;
  type: OccurrenceType;
  priority: OccurrencePriority;
  title: string;
  description: string;
  photos: File[];
};

export type OccurrenceFormErrors = Partial<Record<"unitId" | "title" | "description" | "photos", string>>;

export function emptyOccurrenceForm(unitId: string): OccurrenceForm {
  return { unitId, type: 1, priority: 2, title: "", description: "", photos: [] };
}

export function validateOccurrenceForm(form: OccurrenceForm): OccurrenceFormErrors {
  const errors: OccurrenceFormErrors = {};
  if (!form.unitId) errors.unitId = "Escolha a unidade.";
  if (form.title.trim().length < 3) errors.title = "Dê um título com pelo menos 3 letras.";
  if (form.description.trim().length < 5) errors.description = "Conte o que aconteceu em pelo menos 5 letras.";
  return errors;
}

// Adds the picked files to the current ones; returns the new list and, when some were left out, why.
export function addPhotos(current: File[], picked: File[]): { photos: File[]; error: string } {
  const valid = picked.filter((file) => (file.type === "image/jpeg" || file.type === "image/png") && file.size <= MAX_PHOTO_BYTES);
  const photos = [...current, ...valid].slice(0, MAX_PHOTOS);
  let error = "";
  if (valid.length < picked.length) error = "Use fotos JPG ou PNG de até 10 MB.";
  else if (current.length + valid.length > MAX_PHOTOS) error = `Dá para enviar até ${MAX_PHOTOS} fotos.`;
  return { photos, error };
}
