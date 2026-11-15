import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronDown, Paperclip } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard } from "../../shared/components/SummaryCard";
import { FinanceTabs } from "../finance/FinanceTabs";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { CHARGE_CATEGORIES } from "../charges/chargeCategories";
import { downloadExpenseReceipt, getMonthlyBalance } from "./expenseService";
import { expenseCategoryIcon, monthLabel, monthOf, shortMonthLabel } from "./expenseMeta";
import { MonthNavigator } from "./MonthNavigator";
import type { MonthlyBalance } from "./types";

type Loaded = { key: string; balance: MonthlyBalance | null; errorMessage: string };

// Monthly balance ("prestação de contas") for every role. The API decides the detail:
// management gets each expense; residents get the totals by category and the receipts.
export function MonthlyBalancePage() {
  // Inside the management's Financeiro the screen is a tab; residents open it from Minhas contas.
  const isFinanceArea = useLocation().pathname.includes("/finance/");
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const currentMonth = monthOf(todayInputDate());
  const [month, setMonth] = useState(currentMonth);
  const [loaded, setLoaded] = useState<Loaded>({ key: "", balance: null, errorMessage: "" });
  const [openCategoryId, setOpenCategoryId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState("");

  const key = `${activeCondominiumId}:${month}`;

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;
    const requestKey = `${activeCondominiumId}:${month}`;

    getMonthlyBalance(activeCondominiumId, month)
      .then((balance) => isMounted && setLoaded({ key: requestKey, balance, errorMessage: "" }))
      .catch(
        (error) =>
          isMounted &&
          setLoaded({ key: requestKey, balance: null, errorMessage: error instanceof Error ? error.message : "Não foi possível carregar a prestação de contas." }),
      );

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, month]);

  const isLoading = loaded.key !== key;
  const balance = isLoading ? null : loaded.balance;
  const shownError = downloadError || (isLoading ? "" : loaded.errorMessage);

  async function handleDownload(expenseId: number, fileName: string) {
    setDownloadError("");
    setDownloadingId(expenseId);
    try {
      await downloadExpenseReceipt(expenseId, fileName);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Não foi possível baixar o comprovante.");
    } finally {
      setDownloadingId(null);
    }
  }

  const summary = balance
    ? [
        { label: "Entradas", value: formatCurrency(balance.incomeTotal), detail: "Pagamentos recebidos", tone: "good" as const },
        { label: "Saídas", value: formatCurrency(balance.expenseTotal), detail: "Despesas pagas" },
        {
          label: "Saldo do mês",
          value: formatCurrency(balance.monthBalance),
          tone: balance.monthBalance < 0 ? ("danger" as const) : ("neutral" as const),
        },
        {
          label: "Saldo acumulado",
          value: balance.accumulatedBalance === null ? "—" : formatCurrency(balance.accumulatedBalance),
          detail:
            balance.accumulatedBalance === null
              ? `As contas começam em ${shortMonthLabel(monthOf(balance.openingBalanceMonth ?? ""))}`
              : `Saldo anterior ${formatCurrency(balance.previousBalance ?? 0)}`,
          tone: (balance.accumulatedBalance ?? 0) < 0 ? ("danger" as const) : ("neutral" as const),
        },
      ]
    : [];

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title={isFinanceArea ? "Financeiro" : "Prestação de contas"} />
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

      <div className="mb-5">
        <MonthNavigator
          month={month}
          maxMonth={currentMonth}
          onChange={(value) => {
            setOpenCategoryId(null);
            setMonth(value);
          }}
        />
      </div>

      {shownError && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {shownError}
        </p>
      )}

      {!balance ? (
        isLoading && (
          <p className="flex items-center justify-center gap-2 rounded-card bg-superficie px-5 py-12 text-sm text-tinta-suave shadow-whisper">
            <MoraeMark size={18} motion="respiro" />
            Carregando a prestação de contas…
          </p>
        )
      ) : (
        <div className="flex flex-col gap-8">
          <SummaryCard items={summary} label={`Resumo de ${monthLabel(balance.month)}`} />

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <section aria-labelledby="balance-income">
              <h2 id="balance-income" className="mb-3 flex items-baseline justify-between gap-3 px-1 text-sm font-semibold text-tinta-suave">
                <span>Entradas por categoria</span>
                <span className="tabular-nums text-tinta">{formatCurrency(balance.incomeTotal)}</span>
              </h2>
              <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
                {balance.income.length === 0 ? (
                  <li className="px-5 py-8 text-center text-sm text-tinta-suave">Nenhum pagamento recebido neste mês.</li>
                ) : (
                  balance.income.map((item) => {
                    const Icon = CHARGE_CATEGORIES[item.category]?.icon ?? CHARGE_CATEGORIES[10].icon;
                    return (
                      <li key={item.category} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-verde-suave text-verde-tinta">
                          <Icon size={18} strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-tinta">{item.label}</span>
                          <span className="block text-[13px] tabular-nums text-tinta-suave">
                            {item.paymentCount} {item.paymentCount === 1 ? "pagamento" : "pagamentos"}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-tinta">{formatCurrency(item.total)}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>

            <section aria-labelledby="balance-expenses">
              <h2 id="balance-expenses" className="mb-3 flex items-baseline justify-between gap-3 px-1 text-sm font-semibold text-tinta-suave">
                <span>Saídas por categoria</span>
                <span className="tabular-nums text-tinta">{formatCurrency(balance.expenseTotal)}</span>
              </h2>
              <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
                {balance.expenses.length === 0 ? (
                  <li className="px-5 py-8 text-center text-sm text-tinta-suave">Nenhuma despesa lançada neste mês.</li>
                ) : (
                  balance.expenses.map((item) => {
                    const Icon = expenseCategoryIcon(item.iconKey);
                    const isOpen = openCategoryId === item.categoryId;
                    const canOpen = item.receipts.length > 0 || (item.items?.length ?? 0) > 0;
                    return (
                      <li key={item.categoryId}>
                        <button
                          type="button"
                          aria-expanded={canOpen ? isOpen : undefined}
                          disabled={!canOpen}
                          onClick={() => setOpenCategoryId(isOpen ? null : item.categoryId)}
                          className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors enabled:hover:bg-campo/60 sm:px-5"
                        >
                          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-campo text-tinta">
                            <Icon size={18} strokeWidth={1.8} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold text-tinta">{item.name}</span>
                            <span className="block text-[13px] tabular-nums text-tinta-suave">
                              {item.expenseCount} {item.expenseCount === 1 ? "despesa" : "despesas"}
                              {item.receipts.length > 0 && ` · ${item.receipts.length} ${item.receipts.length === 1 ? "comprovante" : "comprovantes"}`}
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-tinta">{formatCurrency(item.total)}</span>
                          {canOpen && (
                            <ChevronDown size={18} strokeWidth={1.8} aria-hidden className={`shrink-0 text-tinta-suave transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          )}
                        </button>

                        {isOpen && (
                          <ul className="mx-4 mb-3 divide-y divide-linha rounded-block bg-campo sm:mx-5">
                            {item.items
                              ? item.items.map((expense) => (
                                  <li key={expense.id} className="flex items-center gap-3 py-2.5 pl-3.5 pr-1.5">
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-semibold text-tinta">{expense.description || expense.categoryName}</span>
                                      <span className="block truncate text-xs tabular-nums text-tinta-suave">
                                        {[formatCalendarDate(expense.paidOn), expense.supplier, expense.buildingName].filter(Boolean).join(" · ")}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-sm font-semibold tabular-nums text-tinta">{formatCurrency(expense.amount)}</span>
                                    <ReceiptButton
                                      hidden={!expense.hasReceipt}
                                      isLoading={downloadingId === expense.id}
                                      label={`Baixar comprovante de ${expense.description || expense.categoryName}`}
                                      onClick={() => void handleDownload(expense.id, expense.receiptFileName ?? "comprovante")}
                                    />
                                  </li>
                                ))
                              : item.receipts.map((receipt) => (
                                  <li key={receipt.expenseId} className="flex items-center gap-3 py-2 pl-3.5 pr-1.5">
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-semibold text-tinta">{receipt.fileName}</span>
                                      <span className="block text-xs tabular-nums text-tinta-suave">Pago em {formatCalendarDate(receipt.paidOn)}</span>
                                    </span>
                                    <ReceiptButton
                                      isLoading={downloadingId === receipt.expenseId}
                                      label={`Baixar ${receipt.fileName}`}
                                      onClick={() => void handleDownload(receipt.expenseId, receipt.fileName)}
                                    />
                                  </li>
                                ))}
                          </ul>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

function ReceiptButton({ hidden = false, isLoading, label, onClick }: { hidden?: boolean; isLoading: boolean; label: string; onClick: () => void }) {
  if (hidden) return <span aria-hidden className="size-10 shrink-0" />;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-label={label}
      className="grid size-10 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta disabled:cursor-progress"
    >
      {isLoading ? <MoraeMark size={18} motion="respiro" /> : <Paperclip size={18} strokeWidth={1.8} aria-hidden />}
    </button>
  );
}
