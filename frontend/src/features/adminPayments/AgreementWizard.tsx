import { useState } from "react";
import { BadgePercent, Ban, Check, Handshake, User, Wallet } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { Switch } from "../../shared/components/Switch";
import { TextField } from "../../shared/components/TextField";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import type { ChargeResponse } from "../charges/types";
import type { UnitResponse } from "../units/types";
import { installmentLabel } from "../agreements/agreementMeta";
import {
  MAX_INSTALLMENTS,
  agreementCandidates,
  agreementRecipient,
  agreementTotals,
  candidatesOfUnit,
  chosenCharges,
  initialAgreementForm,
  simulateInstallments,
  validateAgreementStep,
  type AgreementForm,
  type AgreementStep,
} from "./agreementForm";
import { unitLabel } from "./chargeForm";
import { Choice, MoneyInput } from "./NewChargeWizard";

type AgreementWizardProps = {
  units: UnitResponse[];
  charges: ChargeResponse[];
  // Opened from a unit or an overdue charge: starts on that unit.
  initialUnitId?: number | null;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (form: AgreementForm) => void;
};

const stepTitles: Record<AgreementStep, string> = {
  1: "Quais cobranças entram?",
  2: "Desconto na multa e nos juros",
  3: "Entrada e parcelas",
  4: "Confira antes de criar",
};

const percentShortcuts = [25, 50, 100];

function Row({ label, value, strong = false, tone = "text-tinta" }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "border-linha [&:not(:first-child)]:border-t [&:not(:first-child)]:pt-2.5" : ""}`}>
      <dt className={strong ? "text-sm font-semibold text-tinta" : "text-sm text-tinta-suave"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-base font-bold" : "text-sm font-semibold"} ${tone}`}>{value}</dd>
    </div>
  );
}

// "Fazer acordo": overdue charges of one unit → discount on fine/interest → down payment and
// installments (simulated on screen, same math as the API) → summary.
export function AgreementWizard({ units, charges, initialUnitId, isSubmitting, error, onClose, onSubmit }: AgreementWizardProps) {
  const [step, setStep] = useState<AgreementStep>(1);
  const [form, setForm] = useState<AgreementForm>(() => initialAgreementForm(initialUnitId ? String(initialUnitId) : "", charges));
  const [stepError, setStepError] = useState("");

  const update = (patch: Partial<AgreementForm>) => setForm((current) => ({ ...current, ...patch }));
  const lateUnitIds = new Set(agreementCandidates(charges).map((charge) => charge.unitId));
  const lateUnits = units.filter((unit) => lateUnitIds.has(unit.id));
  const unit = units.find((item) => String(item.id) === form.unitId);
  const unitCharges = candidatesOfUnit(charges, form.unitId);
  const chosen = chosenCharges(form, charges);
  const totals = agreementTotals(form, charges);
  const simulation = simulateInstallments(form, totals.total);
  const recipient = agreementRecipient(chosen);
  const installments = simulation.filter((item) => item.number > 0);
  const shownError = stepError || (step === 4 ? error : "");

  function chooseUnit(unitId: string) {
    setForm((current) => ({ ...current, unitId, chargeIds: candidatesOfUnit(charges, unitId).map((charge) => charge.id) }));
  }

  function toggleCharge(id: number) {
    update({ chargeIds: form.chargeIds.includes(id) ? form.chargeIds.filter((item) => item !== id) : [...form.chargeIds, id] });
  }

  function next() {
    const validation = validateAgreementStep(step, form, totals);
    if (validation) {
      setStepError(validation);
      return;
    }
    setStepError("");
    if (step === 4) onSubmit(form);
    else setStep((step + 1) as AgreementStep);
  }

  function back() {
    setStepError("");
    if (step === 1) onClose();
    else setStep((step - 1) as AgreementStep);
  }

  const installmentSummary = `${installments.length}x de ${formatCurrency(installments[0]?.value ?? 0)}`;

  return (
    <Modal
      size="lg"
      title="Fazer acordo"
      description={
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{step < 4 ? `Passo ${step} de 3` : "Resumo"}</span>
          <span aria-hidden>·</span>
          <span className="font-semibold text-tinta">{stepTitles[step]}</span>
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={back}>
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          <Button onClick={next} isLoading={isSubmitting} loadingText="Criando…">
            {step === 3 ? "Revisar" : step === 4 ? "Criar acordo" : "Continuar"}
          </Button>
        </>
      }
    >
      <div aria-hidden className="mb-5 flex gap-1.5">
        {[1, 2, 3].map((item) => (
          <span key={item} className={`h-1 flex-1 rounded-full ${item <= step ? "bg-tinta" : "bg-linha"}`} />
        ))}
      </div>

      {shownError && (
        <p role="alert" className="mb-4 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {shownError}
        </p>
      )}

      {step === 1 && (
        <div className="grid gap-4">
          <SelectField
            label="Unidade"
            value={form.unitId}
            onChange={(event) => chooseUnit(event.target.value)}
            placeholder={lateUnits.length ? "Escolha a unidade com atraso" : "Nenhuma unidade com atraso"}
            options={lateUnits.map((item) => ({ value: String(item.id), label: `${unitLabel(item)}${item.responsiblePersonName ? ` · ${item.responsiblePersonName}` : ""}` }))}
          />

          {form.unitId && (
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-tinta">Cobranças atrasadas</p>
                <button
                  type="button"
                  onClick={() => update({ chargeIds: form.chargeIds.length === unitCharges.length ? [] : unitCharges.map((charge) => charge.id) })}
                  className="text-sm font-semibold text-verde-tinta hover:underline"
                >
                  {form.chargeIds.length === unitCharges.length ? "Desmarcar todas" : "Marcar todas"}
                </button>
              </div>
              {unitCharges.length === 0 ? (
                <p className="rounded-block bg-campo px-4 py-6 text-center text-sm text-tinta-suave">Esta unidade não tem cobranças atrasadas.</p>
              ) : (
                <ul className="divide-y divide-linha overflow-hidden rounded-block border border-linha">
                  {unitCharges.map((charge) => {
                    const checked = form.chargeIds.includes(charge.id);
                    const fees = charge.fineAmount + charge.interestAmount;
                    return (
                      <li key={charge.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-campo/60">
                          <input type="checkbox" checked={checked} onChange={() => toggleCharge(charge.id)} className="size-4 shrink-0 accent-verde" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-tinta">{charge.description}</span>
                            <span className="block truncate text-xs text-tinta-suave">
                              venceu {formatCalendarDate(charge.dueDate)} · {charge.daysLate} {charge.daysLate === 1 ? "dia" : "dias"} de atraso
                              {charge.recipientName ? ` · só ${charge.recipientName}` : ""}
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block text-sm font-semibold tabular-nums text-vermelho">{formatCurrency(charge.value + fees)}</span>
                            {fees > 0 && <span className="block text-xs tabular-nums text-tinta-suave">orig. {formatCurrency(charge.value)}</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {chosen.length > 0 && (
                <p className="mt-3 text-[13px] text-tinta-suave">
                  {chosen.length} {chosen.length === 1 ? "cobrança" : "cobranças"} · hoje{" "}
                  <span className="font-semibold tabular-nums text-tinta">{formatCurrency(totals.original + totals.lateFees)}</span>. Elas ficam no histórico como
                  “Renegociada” e saem da inadimplência.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <dl className="grid gap-2 rounded-block bg-campo px-4 py-4">
            <Row label="Valor original" value={formatCurrency(totals.original)} />
            <Row label="Multa" value={formatCurrency(totals.fine)} />
            <Row label="Juros até hoje" value={formatCurrency(totals.interest)} />
          </dl>

          {totals.lateFees === 0 ? (
            <p className="rounded-block bg-campo px-4 py-3 text-[13px] text-tinta-suave">Estas cobranças não têm multa nem juros. Não há o que descontar.</p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <Choice compact selected={form.discountType === 0} icon={<Ban size={18} strokeWidth={1.8} />} title="Sem desconto" onClick={() => update({ discountType: 0 })} />
                <Choice compact selected={form.discountType === 1} icon={<BadgePercent size={18} strokeWidth={1.8} />} title="Em %" hint="da multa e dos juros" onClick={() => update({ discountType: 1, discountValue: "" })} />
                <Choice compact selected={form.discountType === 2} icon={<Wallet size={18} strokeWidth={1.8} />} title="Em R$" hint={`até ${formatCurrency(totals.lateFees)}`} onClick={() => update({ discountType: 2, discountValue: "" })} />
              </div>

              {form.discountType !== 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <MoneyInput
                    label={form.discountType === 1 ? "Desconto em %" : "Desconto em reais"}
                    value={form.discountValue}
                    placeholder={form.discountType === 1 ? "0" : "0,00"}
                    className="w-28"
                    onChange={(value) => update({ discountValue: value })}
                  />
                  <span className="text-sm text-tinta-suave">{form.discountType === 1 ? "%" : "reais"}</span>
                  {form.discountType === 1 &&
                    percentShortcuts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update({ discountValue: String(value) })}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${form.discountValue === String(value) ? "bg-tinta text-white" : "bg-campo text-tinta hover:bg-menu"}`}
                      >
                        {value}%
                      </button>
                    ))}
                </div>
              )}
            </>
          )}

          <dl className="grid gap-2 rounded-block border border-linha px-4 py-4">
            {totals.discount > 0 && <Row label="Desconto" value={`− ${formatCurrency(totals.discount)}`} tone="text-verde-tinta" />}
            <Row strong label="Total do acordo" value={formatCurrency(totals.total)} />
          </dl>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4">
          <div className="rounded-block border border-linha px-4">
            <Switch
              label="Tem entrada"
              description="Um valor pago antes da primeira parcela."
              checked={form.hasDownPayment}
              onChange={(checked) => update({ hasDownPayment: checked })}
            />
            {form.hasDownPayment && (
              <div className="grid gap-4 pb-4 sm:grid-cols-2">
                <TextField label="Valor da entrada" inputMode="decimal" placeholder="0,00" value={form.downPayment} onChange={(event) => update({ downPayment: event.target.value })} />
                <TextField label="Vencimento da entrada" type="date" min={todayInputDate()} value={form.downPaymentDueDate} onChange={(event) => update({ downPaymentDueDate: event.target.value })} />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Parcelas"
              value={form.installmentCount}
              onChange={(event) => update({ installmentCount: event.target.value })}
              options={Array.from({ length: MAX_INSTALLMENTS }, (_, index) => ({ value: String(index + 1), label: `${index + 1}x` }))}
            />
            <TextField label="1ª parcela vence em" type="date" min={todayInputDate()} value={form.firstDueDate} onChange={(event) => update({ firstDueDate: event.target.value })} hint="As outras, no mesmo dia dos meses seguintes." />
            <TextField
              label="Quebra com atraso de"
              inputMode="numeric"
              value={form.breakAfterDaysLate}
              onChange={(event) => update({ breakAfterDaysLate: event.target.value.replace(/\D/g, "").slice(0, 3) })}
              hint="dias numa parcela"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-tinta">Simulação</p>
            <ol className="divide-y divide-linha overflow-hidden rounded-block bg-campo">
              {simulation.map((item) => (
                <li key={item.number} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-tinta">{installmentLabel(item, installments.length)}</span>
                    <span className="text-tinta-suave"> · {formatCalendarDate(item.dueDate)}</span>
                  </span>
                  <span className={`font-semibold tabular-nums ${item.value > 0 ? "text-tinta" : "text-vermelho"}`}>{formatCurrency(item.value)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 bg-superficie/60 px-4 py-2.5 text-sm">
                <span className="font-semibold text-tinta">Total</span>
                <span className="font-bold tabular-nums text-tinta">{formatCurrency(totals.total)}</span>
              </li>
            </ol>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-4">
          <div className="flex items-start gap-3 rounded-block bg-campo px-4 py-4">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-field bg-superficie text-tinta">
              <Handshake size={18} strokeWidth={1.8} />
            </span>
            <p className="text-[15px] font-semibold leading-snug text-tinta">
              Acordo de {formatCurrency(totals.total)} para {unit ? unitLabel(unit) : "a unidade"}:{" "}
              {form.hasDownPayment ? `entrada de ${formatCurrency(simulation[0]?.value ?? 0)} + ` : ""}
              {installmentSummary}, a partir de {formatCalendarDate(form.firstDueDate)}.
            </p>
          </div>

          <dl className="grid gap-2 rounded-block border border-linha px-4 py-4">
            <Row label={`${chosen.length} ${chosen.length === 1 ? "cobrança renegociada" : "cobranças renegociadas"}`} value={formatCurrency(totals.original)} />
            <Row label="Multa e juros de hoje" value={formatCurrency(totals.lateFees)} />
            {totals.discount > 0 && <Row label="Desconto" value={`− ${formatCurrency(totals.discount)}`} tone="text-verde-tinta" />}
            <Row strong label="Total do acordo" value={formatCurrency(totals.total)} />
          </dl>

          <ul className="grid gap-2 text-[13px] text-tinta-suave">
            <li className="flex gap-2">
              <User size={15} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0" />
              <span>Parcelas para {recipient ? <span className="font-semibold text-tinta">só {recipient.name}</span> : "todos da unidade"}, na categoria Acordo, com aviso no app.</span>
            </li>
            <li className="flex gap-2">
              <Check size={15} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0" />
              <span>Quitado quando todas as parcelas forem pagas.</span>
            </li>
            <li className="flex gap-2">
              <Ban size={15} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0" />
              <span>
                Se uma parcela passar de {form.breakAfterDaysLate} dias de atraso, o acordo quebra: as parcelas em aberto são canceladas e as cobranças originais voltam, com multa e
                juros desde o vencimento original.
              </span>
            </li>
          </ul>
        </div>
      )}
    </Modal>
  );
}
