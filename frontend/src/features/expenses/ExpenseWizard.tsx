import { createElement, useId, useState } from "react";
import { FileUp, Plus, Trash2, X } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { todayInputDate } from "../../shared/lib/date";
import { Choice } from "../adminPayments/NewChargeWizard";
import type { BuildingResponse } from "../buildings/types";
import { FileTile } from "../documents/DocumentModals";
import { formatFileSize } from "../documents/documentMeta";
import { initialExpenseForm, toSaveExpenseRequest, validateExpenseForm, type ExpenseForm } from "./expenseForm";
import { RECEIPT_ACCEPT, expenseCategoryHint, expenseCategoryIcon, validateReceipt } from "./expenseMeta";
import type { ExpenseCategory, ExpenseResponse, SaveExpenseRequest } from "./types";

type ExpenseWizardProps = {
  categories: ExpenseCategory[];
  buildings: BuildingResponse[];
  // null = new expense; otherwise it opens on the second step to edit.
  expense: ExpenseResponse | null;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (data: SaveExpenseRequest) => void;
  onCreateCategory: (name: string) => Promise<ExpenseCategory>;
  onDelete?: () => void;
};

// "Lançar despesa" in two questions, like "Nova cobrança": what was paid, then how much and when.
export function ExpenseWizard({ categories, buildings, expense, isSubmitting, error, onClose, onSubmit, onCreateCategory, onDelete }: ExpenseWizardProps) {
  const fileInputId = useId();
  const [step, setStep] = useState<1 | 2>(expense ? 2 : 1);
  const [form, setForm] = useState<ExpenseForm>(() => initialExpenseForm(expense));
  const [stepError, setStepError] = useState("");
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const update = (patch: Partial<ExpenseForm>) => setForm((current) => ({ ...current, ...patch }));
  const category = categories.find((item) => item.id === form.categoryId) ?? null;
  const shownError = stepError || (step === 2 ? error : "");
  const hasCurrentReceipt = Boolean(expense?.hasReceipt) && !form.removeReceipt && !form.file;

  function chooseCategory(categoryId: number) {
    update({ categoryId });
    setStepError("");
    setStep(2);
  }

  async function createCategory() {
    const name = newCategory?.trim() ?? "";
    if (!name) {
      setStepError("Informe o nome da categoria.");
      return;
    }
    setIsCreatingCategory(true);
    setStepError("");
    try {
      const created = await onCreateCategory(name);
      setNewCategory(null);
      chooseCategory(created.id);
    } catch (createError) {
      setStepError(createError instanceof Error ? createError.message : "Não foi possível criar a categoria.");
    } finally {
      setIsCreatingCategory(false);
    }
  }

  function pickFile(file?: File) {
    if (!file) return;
    const fileError = validateReceipt(file);
    setStepError(fileError);
    if (!fileError) update({ file, removeReceipt: false });
  }

  function submit() {
    const validation = validateExpenseForm(form);
    setStepError(validation);
    if (!validation) onSubmit(toSaveExpenseRequest(form));
  }

  return (
    <Modal
      size="lg"
      title={expense ? "Editar despesa" : "Lançar despesa"}
      description={
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{`Passo ${step} de 2`}</span>
          <span aria-hidden>·</span>
          <span className="font-semibold text-tinta">{step === 1 ? "O que foi pago?" : "Quanto e quando?"}</span>
        </span>
      }
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <Button variant="quiet" onClick={onDelete} className="mr-auto text-vermelho max-sm:px-4">
              <Trash2 size={17} strokeWidth={1.8} aria-hidden />
              <span className="max-sm:sr-only">Apagar</span>
            </Button>
          )}
          <Button variant="quiet" onClick={() => (step === 1 || expense ? onClose() : setStep(1))}>
            {step === 1 || expense ? "Cancelar" : "Voltar"}
          </Button>
          {step === 2 && (
            <Button onClick={submit} isLoading={isSubmitting} loadingText="Salvando…">
              {expense ? "Salvar" : "Lançar despesa"}
            </Button>
          )}
        </>
      }
    >
      <div aria-hidden className="mb-5 flex gap-1.5">
        {[1, 2].map((item) => (
          <span key={item} className={`h-1 flex-1 rounded-full ${item <= step ? "bg-tinta" : "bg-linha"}`} />
        ))}
      </div>

      {shownError && (
        <p role="alert" className="mb-4 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {shownError}
        </p>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-4">
          {categories.map((item) => {
            const Icon = expenseCategoryIcon(item.iconKey);
            return (
              <Choice
                key={item.id}
                selected={form.categoryId === item.id}
                icon={<Icon size={18} strokeWidth={1.8} />}
                title={item.name}
                hint={expenseCategoryHint(item.iconKey)}
                onClick={() => chooseCategory(item.id)}
              />
            );
          })}
          {newCategory === null ? (
            <button
              type="button"
              onClick={() => setNewCategory("")}
              className="flex w-full items-center gap-3 rounded-block border-2 border-dashed border-linha px-3.5 py-3.5 text-left text-tinta-suave transition-colors hover:bg-campo sm:flex-col sm:items-start sm:py-4"
            >
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-field bg-campo text-tinta">
                <Plus size={18} strokeWidth={1.8} />
              </span>
              <span className="block text-[15px] font-semibold text-tinta">Nova categoria</span>
            </button>
          ) : (
            <div className="col-span-full flex flex-col gap-2 rounded-block bg-campo p-3 sm:flex-row sm:items-end">
              <TextField
                label="Nome da nova categoria"
                className="flex-1"
                value={newCategory}
                maxLength={60}
                autoFocus
                placeholder="Ex.: Jardinagem"
                onChange={(event) => setNewCategory(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createCategory();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button variant="quiet" onClick={() => setNewCategory(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => void createCategory()} isLoading={isCreatingCategory} loadingText="Criando…">
                  Criar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          {category && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-3 rounded-block bg-campo px-4 py-3 text-left transition-colors hover:bg-menu"
            >
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-field bg-superficie text-tinta">
                {createElement(expenseCategoryIcon(category.iconKey), { size: 18, strokeWidth: 1.8 })}
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold text-tinta">{category.name}</span>
              <span className="text-sm font-semibold text-tinta-suave underline-offset-2 hover:underline">Trocar</span>
            </button>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Valor pago (R$)" value={form.amount} onChange={(event) => update({ amount: event.target.value })} placeholder="1.250,00" inputMode="decimal" />
            <TextField label="Pago em" type="date" max={todayInputDate()} value={form.paidOn} onChange={(event) => update({ paidOn: event.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Fornecedor (opcional)" value={form.supplier} maxLength={150} placeholder="Ex.: Sabesp" onChange={(event) => update({ supplier: event.target.value })} />
            {buildings.length > 0 && (
              <SelectField
                label="Prédio (opcional)"
                value={form.buildingId}
                onChange={(event) => update({ buildingId: event.target.value })}
                options={[{ value: "", label: "Condomínio todo" }, ...buildings.map((building) => ({ value: String(building.id), label: building.name }))]}
              />
            )}
          </div>

          <TextField
            label="Descrição (opcional)"
            value={form.description}
            maxLength={255}
            placeholder={category ? `Ex.: ${category.name} de outubro` : undefined}
            onChange={(event) => update({ description: event.target.value })}
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-tinta">Comprovante (opcional)</span>
            {form.file || hasCurrentReceipt ? (
              <div className="flex items-center gap-3 rounded-field bg-campo px-4 py-3">
                <FileTile contentType={form.file?.type ?? (expense?.receiptFileName?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-tinta">{form.file?.name ?? expense?.receiptFileName}</span>
                  <span className="block text-[13px] tabular-nums text-tinta-suave">{formatFileSize(form.file?.size ?? expense?.receiptSizeBytes ?? 0)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => update(form.file ? { file: null } : { removeReceipt: true })}
                  aria-label="Remover comprovante"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta"
                >
                  <X size={18} strokeWidth={1.8} aria-hidden />
                </button>
              </div>
            ) : (
              <label
                htmlFor={fileInputId}
                className="flex cursor-pointer items-center gap-3 rounded-field border-2 border-dashed border-linha bg-campo px-4 py-4 transition-colors hover:bg-menu has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-verde"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-block bg-superficie text-tinta shadow-whisper">
                  <FileUp size={19} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-tinta">Anexar nota, boleto ou recibo</span>
                  <span className="block text-[13px] text-tinta-suave">PDF, JPG ou PNG · até 20 MB · os moradores podem ver</span>
                </span>
                <input
                  id={fileInputId}
                  type="file"
                  accept={RECEIPT_ACCEPT}
                  className="sr-only"
                  onChange={(event) => {
                    pickFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
