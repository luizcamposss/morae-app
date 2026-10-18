export type ImportAction = "create" | "existing";

export type ImportCount = { created: number; skipped: number };

export type ImportSummary = {
  buildings: ImportCount;
  units: ImportCount;
  persons: ImportCount;
  links: ImportCount;
  charges: ImportCount;
};

export type ImportRow = {
  line: number;
  errors: string[];
  warnings: string[];
  building: string;
  buildingAction: ImportAction | null;
  unit: string;
  unitTypeLabel: string | null;
  unitAction: ImportAction | null;
  personName: string | null;
  cpf: string | null;
  phoneNumber: string | null;
  email: string | null;
  personAction: ImportAction | null;
  relationshipLabel: string | null;
  linkAction: ImportAction | null;
  chargeValue: number | null;
  chargeDueDate: string | null;
  chargeDescription: string | null;
  chargeAction: ImportAction | null;
};

export type ImportPreview = {
  fileName: string;
  totalRows: number;
  errorRows: number;
  canConfirm: boolean;
  recognizedColumns: string[];
  ignoredColumns: string[];
  summary: ImportSummary;
  rows: ImportRow[];
};

export type ImportResult = { totalRows: number; summary: ImportSummary };
