import { useEffect, useState, type ReactNode } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { TextField } from "../../shared/components/TextField";
import { parseCurrencyInput } from "../adminPayments/chargeForm";
import { updateBillingSettings } from "../charges/billingService";
import type { BillingSettings } from "../charges/types";
import { createExpenseCategory, deleteExpenseCategory, getExpenseCategories, renameExpenseCategory } from "./expenseService";
import { expenseCategoryIcon } from "./expenseMeta";
import type { ExpenseCategory } from "./types";

type ExpenseSettingsModalProps = {
  condominiumId: number;
  settings: BillingSettings;
  onClose: () => void;
  onSaved: (settings: BillingSettings) => void;
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// Admin settings of the monthly balance: the opening balance and the expense categories.
export function ExpenseSettingsModal({ condominiumId, settings, onClose, onSaved }: ExpenseSettingsModalProps) {
  const [amount, setAmount] = useState(settings.openingBalance ? settings.openingBalance.toFixed(2).replace(".", ",") : "");
  const [startMonth, setStartMonth] = useState(settings.openingBalanceMonth?.slice(0, 7) ?? "");
  const [categories, setCategories] = useState<ExpenseCategory[] | null>(null);
  const [editing, setEditing] = useState<{ id: number | null; name: string } | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [busyCategoryId, setBusyCategoryId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    getExpenseCategories(condominiumId)
      .then((list) => isMounted && setCategories(list))
      .catch((loadError) => {
        if (!isMounted) return;
        setCategories([]);
        setError(errorText(loadError, "Não foi possível carregar as categorias."));
      });
    return () => {
      isMounted = false;
    };
  }, [condominiumId]);

  async function saveCategory() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      setError("Informe o nome da categoria.");
      return;
    }
    setError("");
    setBusyCategoryId(editing.id ?? -1);
    try {
      if (editing.id) {
        const saved = await renameExpenseCategory(editing.id, name);
        setCategories((current) => current?.map((item) => (item.id === saved.id ? saved : item)) ?? null);
      } else {
        const saved = await createExpenseCategory(condominiumId, name);
        setCategories((current) => [...(current ?? []), saved]);
      }
      setEditing(null);
    } catch (saveError) {
      setError(errorText(saveError, "Não foi possível salvar a categoria."));
    } finally {
      setBusyCategoryId(null);
    }
  }

  async function removeCategory(category: ExpenseCategory) {
    setError("");
    setBusyCategoryId(category.id);
    try {
      await deleteExpenseCategory(category.id);
      setCategories((current) => current?.filter((item) => item.id !== category.id) ?? null);
    } catch (deleteError) {
      setError(errorText(deleteError, "Não foi possível apagar a categoria."));
    } finally {
      setBusyCategoryId(null);
    }
  }

  async function saveOpeningBalance() {
    const value = amount.trim() ? parseCurrencyInput(amount.replace(/^-\s*/, "-")) : 0;
    if (!Number.isFinite(value)) {
      setError("Informe um saldo inicial válido.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const saved = await updateBillingSettings(condominiumId, {
        billingDueDay: settings.billingDueDay,
        lateFeeEnabled: settings.lateFeeEnabled,
        finePercent: settings.finePercent,
        monthlyInterestPercent: settings.monthlyInterestPercent,
        openingBalance: Math.round(value * 100) / 100,
        openingBalanceMonth: startMonth ? `${startMonth}-01` : null,
      });
      onSaved(saved);
      onClose();
    } catch (saveError) {
      setError(errorText(saveError, "Não foi possível salvar o saldo inicial."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      size="lg"
      title="Prestação de contas"
      description="Saldo inicial do caixa e categorias das despesas."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => void saveOpeningBalance()} isLoading={isSaving} loadingText="Salvando…">
            Salvar saldo inicial
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {error && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {error}
          </p>
        )}

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-tinta">Saldo inicial</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Valor em caixa (R$)" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" inputMode="decimal" />
            <TextField label="No início de" type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} />
          </div>
          <p className="text-[13px] text-tinta-suave">
            O saldo acumulado começa neste valor e soma as entradas menos as saídas de cada mês a partir daí. Sem mês, conta desde o primeiro lançamento.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-tinta">Categorias de despesa</h3>
            {editing?.id !== null && (
              <Button variant="quiet" size="sm" onClick={() => setEditing({ id: null, name: "" })}>
                <Plus size={16} strokeWidth={2} aria-hidden />
                Nova
              </Button>
            )}
          </div>

          {categories === null ? (
            <p className="flex items-center gap-2 text-sm text-tinta-suave">
              <MoraeMark size={18} motion="respiro" />
              Carregando categorias…
            </p>
          ) : (
            <ul className="divide-y divide-linha rounded-block border border-linha">
              {[...categories, ...(editing && editing.id === null ? [null] : [])].map((category) => {
                const isEditing = editing !== null && editing.id === (category?.id ?? null);
                const Icon = expenseCategoryIcon(category?.iconKey);
                return (
                  <li key={category?.id ?? "new"} className="flex items-center gap-3 px-3 py-2">
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-field bg-campo text-tinta">
                      <Icon size={16} strokeWidth={1.8} />
                    </span>
                    {isEditing ? (
                      <>
                        <input
                          aria-label="Nome da categoria"
                          value={editing.name}
                          maxLength={60}
                          autoFocus
                          onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void saveCategory();
                            if (event.key === "Escape") {
                              event.stopPropagation();
                              setEditing(null);
                            }
                          }}
                          className="min-w-0 flex-1 rounded-field bg-campo px-3 py-2 text-sm text-tinta outline-none focus:bg-superficie focus:ring-2 focus:ring-verde"
                        />
                        <IconButton label="Salvar categoria" onClick={() => void saveCategory()} disabled={busyCategoryId !== null}>
                          <Check size={17} strokeWidth={2} aria-hidden />
                        </IconButton>
                        <IconButton label="Cancelar" onClick={() => setEditing(null)}>
                          <X size={17} strokeWidth={1.8} aria-hidden />
                        </IconButton>
                      </>
                    ) : (
                      category && (
                        <>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-tinta">{category.name}</span>
                            <span className="block text-xs tabular-nums text-tinta-suave">
                              {category.expenseCount === 0 ? "Nenhuma despesa" : `${category.expenseCount} ${category.expenseCount === 1 ? "despesa" : "despesas"}`}
                            </span>
                          </span>
                          <IconButton label={`Renomear ${category.name}`} onClick={() => setEditing({ id: category.id, name: category.name })}>
                            <Pencil size={16} strokeWidth={1.8} aria-hidden />
                          </IconButton>
                          {category.expenseCount === 0 && (
                            <IconButton label={`Apagar ${category.name}`} onClick={() => void removeCategory(category)} disabled={busyCategoryId === category.id}>
                              <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                            </IconButton>
                          )}
                        </>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta disabled:cursor-progress"
    >
      {children}
    </button>
  );
}
