import { useEffect, useState } from "react";
import { Paperclip, Plus, Wallet } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { SelectField } from "../../shared/components/SelectField";
import { FinanceTabs } from "../finance/FinanceTabs";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { createExpense, createExpenseCategory, deleteExpense, downloadExpenseReceipt, getExpenseCategories, getExpenses, updateExpense } from "./expenseService";
import { expenseCategoryIcon, monthLabel, monthOf } from "./expenseMeta";
import { ExpenseWizard } from "./ExpenseWizard";
import { MonthNavigator } from "./MonthNavigator";
import type { ExpenseCategory, ExpenseResponse, SaveExpenseRequest } from "./types";

type Loaded = { key: string; expenses: ExpenseResponse[]; errorMessage: string };
type Lists = { condominiumId: number | null; categories: ExpenseCategory[]; buildings: BuildingResponse[]; errorMessage: string };
type WizardState = { expense: ExpenseResponse | null } | null;

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// Management view (Admin; syndic with expenses.manage): the month's paid bills, filtered by
// category, with "Lançar despesa", edit, delete and the receipts.
export function ExpensesPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const currentMonth = monthOf(todayInputDate());
  const [month, setMonth] = useState(currentMonth);
  const [loaded, setLoaded] = useState<Loaded>({ key: "", expenses: [], errorMessage: "" });
  const [lists, setLists] = useState<Lists>({ condominiumId: null, categories: [], buildings: [], errorMessage: "" });
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [wizard, setWizard] = useState<WizardState>(null);
  const [wizardError, setWizardError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  const key = `${activeCondominiumId}:${month}`;

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    // Buildings are optional on an expense: without access to them the field just stays hidden.
    Promise.allSettled([getExpenseCategories(activeCondominiumId), getBuildingsByCondominium(activeCondominiumId)]).then(([categories, buildings]) => {
      if (!isMounted) return;
      setLists({
        condominiumId: activeCondominiumId,
        categories: categories.status === "fulfilled" ? categories.value : [],
        buildings: buildings.status === "fulfilled" ? buildings.value : [],
        errorMessage: categories.status === "rejected" ? errorText(categories.reason, "Não foi possível carregar as categorias.") : "",
      });
    });

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;
    const requestKey = `${activeCondominiumId}:${month}`;

    getExpenses(activeCondominiumId, month)
      .then((expenses) => isMounted && setLoaded({ key: requestKey, expenses, errorMessage: "" }))
      .catch((error) => isMounted && setLoaded({ key: requestKey, expenses: [], errorMessage: errorText(error, "Não foi possível carregar as despesas.") }));

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, month]);

  const isLoading = loaded.key !== key;
  const expenses = isLoading ? [] : loaded.expenses;
  const visible = categoryId ? expenses.filter((item) => item.categoryId === categoryId) : expenses;
  const total = visible.reduce((sum, item) => sum + item.amount, 0);
  const categories = lists.condominiumId === activeCondominiumId ? lists.categories : [];
  const shownError = errorMessage || (isLoading ? "" : loaded.errorMessage) || lists.errorMessage;

  // Only the categories used in the month, so the filter row stays short.
  const usedCategories = categories.filter((category) => expenses.some((item) => item.categoryId === category.id));
  const tabs = [{ value: null as number | null, label: "Todas", count: expenses.length }, ...usedCategories.map((category) => ({ value: category.id as number | null, label: category.name, count: expenses.filter((item) => item.categoryId === category.id).length }))];

  async function reload() {
    if (!activeCondominiumId) return;
    const result = await getExpenses(activeCondominiumId, month);
    setLoaded({ key, expenses: result, errorMessage: "" });
  }

  function openWizard(expense: ExpenseResponse | null) {
    setErrorMessage("");
    setSuccessMessage("");
    setWizardError("");
    setWizard({ expense });
  }

  async function handleCreateCategory(name: string) {
    if (!activeCondominiumId) throw new Error("Escolha um condomínio.");
    const created = await createExpenseCategory(activeCondominiumId, name);
    setLists((current) => ({ ...current, categories: [...current.categories, created] }));
    return created;
  }

  async function handleSubmit(data: SaveExpenseRequest) {
    if (!activeCondominiumId) return;
    const editing = wizard?.expense;
    setIsSubmitting(true);
    setWizardError("");

    try {
      if (editing) await updateExpense(editing.id, data);
      else await createExpense(activeCondominiumId, data);

      setWizard(null);
      const savedMonth = monthOf(data.paidOn);
      const amount = formatCurrency(data.amount);
      if (savedMonth !== month) {
        setMonth(savedMonth);
        setCategoryId(null);
      } else {
        await reload();
      }
      setSuccessMessage(editing ? "Despesa atualizada." : `Despesa de ${amount} lançada em ${monthLabel(savedMonth)}.`);
    } catch (error) {
      setWizardError(errorText(error, "Não foi possível salvar a despesa."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function askDelete(expense: ExpenseResponse) {
    setWizard(null);
    setConfirmRequest({
      title: "Apagar esta despesa?",
      description: `${expense.categoryName} de ${formatCurrency(expense.amount)} sai da prestação de contas${expense.hasReceipt ? ", junto com o comprovante" : ""}. Esta ação não pode ser desfeita.`,
      confirmLabel: "Apagar despesa",
      tone: "danger",
      onConfirm: async () => {
        setSuccessMessage("");
        try {
          await deleteExpense(expense.id);
          await reload();
          setSuccessMessage("Despesa apagada.");
        } catch (error) {
          setErrorMessage(errorText(error, "Não foi possível apagar a despesa."));
        }
      },
    });
  }

  async function handleDownload(expense: ExpenseResponse) {
    setErrorMessage("");
    setDownloadingId(expense.id);
    try {
      await downloadExpenseReceipt(expense.id, expense.receiptFileName ?? "comprovante");
    } catch (error) {
      setErrorMessage(errorText(error, "Não foi possível baixar o comprovante."));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Financeiro">
        <Button variant="accent" onClick={() => openWizard(null)} disabled={!activeCondominiumId || categories.length === 0} className="max-sm:px-4">
          <Plus size={18} strokeWidth={2} aria-hidden />
          <span className="max-sm:sr-only">Lançar despesa</span>
        </Button>
      </PageHeader>
      <FinanceTabs />

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={String(activeCondominiumId ?? "")}
          options={condominiums.map((item) => ({ value: String(item.condominiumId), label: item.condominiumName }))}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        />
      )}

      {shownError && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {shownError}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-6 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <MonthNavigator
          month={month}
          maxMonth={currentMonth}
          onChange={(value) => {
            setSuccessMessage("");
            setCategoryId(null);
            setMonth(value);
          }}
        />
        <p className="text-sm text-tinta-suave sm:text-right">
          {isLoading ? " " : (
            <>
              {visible.length} {visible.length === 1 ? "despesa" : "despesas"} ·{" "}
              <span className="font-display text-lg font-bold tabular-nums text-tinta">{formatCurrency(total)}</span>
            </>
          )}
        </p>
      </div>

      {usedCategories.length > 1 && (
        <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          <div role="group" aria-label="Filtrar por categoria" className="inline-flex gap-1 rounded-block bg-menu p-1">
            {tabs.map((tab) => {
              const isActive = categoryId === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setCategoryId(tab.value)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-field px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                  }`}
                >
                  {tab.label}
                  <span className="text-xs tabular-nums text-tinta-suave">{tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
        {visible.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-12 text-center">
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm text-tinta-suave">
                <MoraeMark size={18} motion="respiro" />
                Carregando despesas…
              </span>
            ) : loaded.errorMessage ? (
              <span className="text-sm text-tinta-suave">Não foi possível mostrar as despesas agora.</span>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <Wallet size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-4 font-display text-lg font-bold text-tinta">Nenhuma despesa em {monthLabel(month)}</span>
                <span className="mt-1 max-w-sm text-sm text-tinta-suave">
                  Lance as contas pagas do condomínio. Elas entram na prestação de contas que os moradores veem.
                </span>
                {categories.length > 0 && (
                  <Button variant="quiet" size="sm" className="mt-5" onClick={() => openWizard(null)}>
                    Lançar despesa
                  </Button>
                )}
              </>
            )}
          </li>
        ) : (
          visible.map((expense) => {
            const Icon = expenseCategoryIcon(expense.categoryIconKey);
            return (
              <li key={expense.id} className="flex items-center gap-2 pr-3 transition-colors hover:bg-campo/60 sm:gap-3 sm:pr-4">
                <button type="button" onClick={() => openWizard(expense)} className="flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-4 text-left sm:pl-5">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-campo text-tinta">
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-tinta">{expense.description || expense.categoryName}</span>
                    <span className="block truncate text-[13px] tabular-nums text-tinta-suave">
                      {[formatCalendarDate(expense.paidOn), expense.description ? expense.categoryName : null, expense.supplier, expense.buildingName].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-tinta">{formatCurrency(expense.amount)}</span>
                </button>
                {expense.hasReceipt ? (
                  <button
                    type="button"
                    onClick={() => void handleDownload(expense)}
                    disabled={downloadingId === expense.id}
                    aria-label={`Baixar comprovante de ${expense.description || expense.categoryName}`}
                    className="grid size-10 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta disabled:cursor-progress"
                  >
                    {downloadingId === expense.id ? <MoraeMark size={18} motion="respiro" /> : <Paperclip size={18} strokeWidth={1.8} aria-hidden />}
                  </button>
                ) : (
                  <span aria-hidden className="size-10 shrink-0" />
                )}
              </li>
            );
          })
        )}
      </ul>

      {wizard && (
        <ExpenseWizard
          categories={categories}
          buildings={lists.buildings}
          expense={wizard.expense}
          isSubmitting={isSubmitting}
          error={wizardError}
          onClose={() => setWizard(null)}
          onSubmit={(data) => void handleSubmit(data)}
          onCreateCategory={handleCreateCategory}
          onDelete={wizard.expense ? () => askDelete(wizard.expense as ExpenseResponse) : undefined}
        />
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}
