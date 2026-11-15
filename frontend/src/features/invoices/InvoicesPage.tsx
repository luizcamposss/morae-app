import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Pencil, Send, Trash2 } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { CHARGE_CATEGORIES } from "../charges/chargeCategories";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeItem } from "../charges/types";
import { MonthNavigator } from "../expenses/MonthNavigator";
import { monthLabel, monthOf, shiftMonth } from "../expenses/expenseMeta";
import { StatusChip } from "../settings/StatusChip";
import { useIsSyndicArea, useSyndicCan } from "../syndicAccess/useSyndicAccess";
import { InvoiceItemModal } from "./InvoiceItemModal";
import { AutoSendModal, DueDateModal } from "./InvoiceSettingsModals";
import { deleteInvoiceDraft, deleteInvoiceItem, getInvoiceMonth, sendInvoices, type InvoiceMonth, type InvoiceResponse } from "./invoiceService";

type ItemModal = { item: ChargeItem } | null;

const statusChip: Record<number, { tone: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  [CHARGE_STATUS.draft]: { tone: "neutral", label: "Rascunho" },
  [CHARGE_STATUS.pending]: { tone: "warning", label: "Enviada" },
  [CHARGE_STATUS.overdue]: { tone: "danger", label: "Atrasada" },
  [CHARGE_STATUS.paid]: { tone: "success", label: "Paga" },
  [CHARGE_STATUS.renegotiated]: { tone: "neutral", label: "Em acordo" },
};

// "A sair" in Financeiro → Contas: the month's bills still being put together (one per unit and
// payer, with its items). They go out on their own days before they are due, or with "Enviar contas".
export function InvoicesBoard() {
  const { activeCondominiumId } = useCondominium();
  const isSyndic = useIsSyndicArea();
  const canEdit = useSyndicCan("charges.create");
  const currentMonth = monthOf(todayInputDate());
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<{ key: string; month: InvoiceMonth | null; error: string } | null>(null);
  const [itemModal, setItemModal] = useState<ItemModal>(null);
  const [dueDateBill, setDueDateBill] = useState<InvoiceResponse | null>(null);
  const [isAutoSendOpen, setIsAutoSendOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${activeCondominiumId}-${month}-${reloadKey}`;
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;
    getInvoiceMonth(activeCondominiumId, month)
      .then((result) => isMounted && setData({ key, month: result, error: "" }))
      .catch((error) => isMounted && setData({ key, month: null, error: error instanceof Error ? error.message : "Não foi possível carregar as contas." }));
    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, month, key]);


  const isLoading = data?.key !== key;
  const bills = useMemo(() => (isLoading ? [] : (data?.month?.invoices ?? [])), [data, isLoading]);
  const drafts = bills.filter((bill) => bill.status === CHARGE_STATUS.draft);
  const draftTotal = drafts.reduce((sum, bill) => sum + bill.value, 0);
  const today = todayInputDate();
  const pastDueDrafts = drafts.filter((bill) => bill.dueDate.slice(0, 10) < today).length;
  const autoSendDays = data?.month?.autoSendDaysBefore ?? null;

  function askSend() {
    if (!activeCondominiumId) return;
    setConfirm({
      title: `Enviar ${drafts.length === 1 ? "1 conta" : `${drafts.length} contas`}?`,
      description: `${formatCurrency(draftTotal)} no total. Cada pessoa recebe a conta no app e por e-mail, com o detalhe dos itens. Depois de enviada, a conta não muda mais.`,
      confirmLabel: "Enviar contas",
      onConfirm: async () => {
        try {
          const result = await sendInvoices(activeCondominiumId, month);
          setFeedback(`${result.sent === 1 ? "1 conta enviada" : `${result.sent} contas enviadas`}. Acompanhe os pagamentos em A receber.`);
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : "Não foi possível enviar as contas.");
        }
        reload();
      },
    });
  }

  function askRemoveItem(bill: InvoiceResponse, item: ChargeItem) {
    setConfirm({
      title: "Tirar este item?",
      description: bill.items.length === 1 ? "É o único item: a conta em rascunho também sai." : `${item.description} sai da conta (${formatCurrency(item.amount)}).`,
      confirmLabel: "Tirar",
      tone: "danger",
      onConfirm: async () => {
        await deleteInvoiceItem(item.id).catch((error) => setFeedback(error instanceof Error ? error.message : "Não foi possível tirar o item."));
        reload();
      },
    });
  }

  function askDeleteDraft(bill: InvoiceResponse) {
    setConfirm({
      title: "Apagar este rascunho?",
      description: `A conta de ${bill.buildingName} · ${bill.unitNumber} (${formatCurrency(bill.value)}) é apagada com os itens. O morador nunca a viu.`,
      confirmLabel: "Apagar",
      tone: "danger",
      onConfirm: async () => {
        await deleteInvoiceDraft(bill.chargeId).catch((error) => setFeedback(error instanceof Error ? error.message : "Não foi possível apagar."));
        reload();
      },
    });
  }

  return (
    <>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthNavigator month={month} maxMonth={shiftMonth(currentMonth, 3)} onChange={setMonth} />
        <p className="text-sm text-tinta-suave tabular-nums">
          {isLoading ? "Carregando…" : `${bills.length === 1 ? "1 conta" : `${bills.length} contas`} · ${formatCurrency(bills.reduce((sum, bill) => sum + bill.value, 0))}`}
        </p>
      </div>

      {feedback && (
        <p role="status" className="mb-6 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {feedback}
        </p>
      )}
      {data?.error && !isLoading && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {data.error}
        </p>
      )}

      {canEdit && !isLoading && (
        <section className="mb-6 flex flex-col gap-3 rounded-card bg-superficie px-5 py-4 shadow-whisper sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-field bg-menu text-tinta">
            <Send size={18} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-tinta">
              {drafts.length > 0
                ? `${drafts.length === 1 ? "1 conta em rascunho" : `${drafts.length} contas em rascunho`} · ${formatCurrency(draftTotal)}`
                : "Nenhuma conta em rascunho"}
            </p>
            <p className="text-tinta-suave">
              {pastDueDrafts > 0 && (
                <span className="font-semibold text-vermelho">
                  {pastDueDrafts === 1 ? "1 conta vence numa data que já passou: mude o vencimento. " : `${pastDueDrafts} contas vencem numa data que já passou: mude o vencimento. `}
                </span>
              )}
              {drafts.length > 0 ? "Os moradores ainda não veem. " : ""}
              {autoSendDays === null ? "Envio só quando você clicar." : `Saem sozinhas ${autoSendDays} ${autoSendDays === 1 ? "dia" : "dias"} antes do vencimento.`}{" "}
              {!isSyndic && (
                <button type="button" onClick={() => setIsAutoSendOpen(true)} className="font-semibold text-verde-tinta hover:underline">
                  Mudar
                </button>
              )}
            </p>
          </div>
          {drafts.length > 0 && (
            <Button size="sm" onClick={askSend} disabled={pastDueDrafts > 0}>
              Enviar contas ({drafts.length})
            </Button>
          )}
        </section>
      )}

      {!isLoading && bills.length === 0 && !data?.error && (
        <div className="rounded-card bg-campo px-6 py-10 text-center">
          <p className="font-semibold text-tinta">Nenhuma conta em {monthLabel(month)}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-tinta-suave">
            A conta do mês junta o que a unidade paga no mês (taxa, aluguel, água, luz), num Pix só. Ela se monta sozinha pelos contratos, pela tela Água, luz e gás e pelo "Lançar cobrança".
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {bills.map((bill) => {
          const isDraft = bill.status === CHARGE_STATUS.draft;
          const chip = statusChip[bill.status] ?? { tone: "neutral", label: "Cancelada" };
          return (
            <article key={bill.chargeId} className="flex flex-col rounded-card bg-superficie p-5 shadow-whisper">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-tinta">
                    {bill.buildingName} · {bill.unitNumber}
                  </h2>
                  <p className="truncate text-[13px] text-tinta-suave">{bill.recipientName ? `Para ${bill.recipientName}` : "Para todos da unidade"}</p>
                </div>
                <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
              </header>

              <ul className="mt-4 divide-y divide-linha border-y border-linha">
                {bill.items.map((item) => {
                  const Icon = CHARGE_CATEGORIES[item.category]?.icon ?? CHARGE_CATEGORIES[10].icon;
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-2.5">
                      <Icon size={16} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                      <span className="min-w-0 flex-1 truncate text-sm text-tinta">{item.description}</span>
                      <span className="text-sm font-medium tabular-nums text-tinta">{formatCurrency(item.amount)}</span>
                      {isDraft && canEdit && (
                        <span className="flex shrink-0 gap-0.5">
                          <button type="button" aria-label={`Editar ${item.description}`} onClick={() => setItemModal({ item })} className="rounded-chip p-1.5 text-tinta-suave hover:bg-menu hover:text-tinta">
                            <Pencil size={14} strokeWidth={1.8} aria-hidden />
                          </button>
                          <button type="button" aria-label={`Tirar ${item.description}`} onClick={() => askRemoveItem(bill, item)} className="rounded-chip p-1.5 text-tinta-suave hover:bg-vermelho-suave hover:text-vermelho">
                            <Trash2 size={14} strokeWidth={1.8} aria-hidden />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 flex items-baseline justify-between">
                <span className={`flex items-center gap-1.5 text-[13px] ${isDraft && bill.dueDate.slice(0, 10) < today ? "font-semibold text-vermelho" : "text-tinta-suave"}`}>
                  <CalendarClock size={14} strokeWidth={1.8} aria-hidden />
                  Vence {formatCalendarDate(bill.dueDate)}
                  {isDraft && canEdit && (
                    <button type="button" onClick={() => setDueDateBill(bill)} className="font-semibold text-verde-tinta hover:underline">
                      mudar
                    </button>
                  )}
                </span>
                <span className="text-lg font-bold tabular-nums text-tinta">{formatCurrency(bill.value)}</span>
              </div>

              {isDraft && canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => askDeleteDraft(bill)} className="ml-auto rounded-full px-2 text-sm font-semibold text-vermelho hover:underline">
                    Apagar rascunho
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {itemModal && <InvoiceItemModal item={itemModal.item} onClose={() => setItemModal(null)} onSaved={reload} />}
      {dueDateBill && <DueDateModal chargeId={dueDateBill.chargeId} dueDate={dueDateBill.dueDate} onClose={() => setDueDateBill(null)} onSaved={reload} />}
      {isAutoSendOpen && activeCondominiumId && <AutoSendModal condominiumId={activeCondominiumId} onClose={() => setIsAutoSendOpen(false)} onSaved={reload} />}
      {confirm && <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />}
    </>
  );
}
