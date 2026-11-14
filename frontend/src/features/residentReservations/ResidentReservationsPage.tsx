import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, Trees } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SelectField } from "../../shared/components/SelectField";
import { TextAreaField } from "../../shared/components/TextAreaField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { WEEKDAY_HEADERS, addMonths, rangeOf, daysBetween, rangeTitle } from "../agenda/agendaMeta";
import { getMyUnits } from "../me/meService";
import type { MeUnitResponse } from "../me/types";
import { formatDayHeading } from "../visits/visitMeta";
import { AreaPhoto, ReservationStatusChip } from "../reservations/ReservationParts";
import { RESERVATION_STATUS, cancelFeeNotice, describeRules, formatSlot } from "../reservations/reservationMeta";
import { cancelReservation, createReservation, getAvailability, getBookableAreas, getMyReservations } from "../reservations/reservationService";
import type { AvailabilitySlot, CommonAreaAvailability, CommonAreaResponse, ReservationResponse } from "../reservations/types";

type Tab = "book" | "mine";

// Resident view, phone first: pick an area → a day and a free shift on the calendar → confirm
// with the terms and the fee → follow it in "Minhas reservas".
export function ResidentReservationsPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const today = todayInputDate();
  const [tab, setTab] = useState<Tab>("book");
  const [data, setData] = useState<{ key: string; areas: CommonAreaResponse[]; reservations: ReservationResponse[] }>({ key: "", areas: [], reservations: [] });
  const [allUnits, setAllUnits] = useState<MeUnitResponse[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  const requestKey = `${activeCondominiumId}|${reloadToken}`;
  const isLoading = data.key !== requestKey;
  const selectedArea = data.areas.find((area) => area.id === selectedAreaId) ?? null;

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    Promise.all([getBookableAreas(activeCondominiumId), getMyReservations(activeCondominiumId, true)])
      .then(([areas, reservations]) => {
        if (!isMounted) return;
        setErrorMessage("");
        setData({ key: requestKey, areas, reservations });
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as reservas.");
        setData({ key: requestKey, areas: [], reservations: [] });
      });

    return () => {
      isMounted = false;
    };
    // requestKey already sums up every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  useEffect(() => {
    let isMounted = true;
    getMyUnits()
      .then((units) => isMounted && setAllUnits(units))
      .catch(() => isMounted && setAllUnits([]));
    return () => {
      isMounted = false;
    };
  }, []);

  const upcoming = data.reservations
    .filter((reservation) => reservation.date >= today && (reservation.status === RESERVATION_STATUS.pending || reservation.status === RESERVATION_STATUS.approved));
  const history = data.reservations.filter((reservation) => !upcoming.includes(reservation)).reverse();

  function askCancel(reservation: ReservationResponse) {
    setSuccessMessage("");
    setConfirmRequest({
      title: "Cancelar esta reserva?",
      description: `${reservation.commonAreaName}, ${formatDayHeading(reservation.date, today).toLowerCase()} (${reservation.shiftName}). O horário fica livre para outras unidades.${cancelFeeNotice(reservation, today)}`,
      confirmLabel: "Cancelar reserva",
      cancelLabel: "Voltar",
      tone: "danger",
      onConfirm: async () => {
        try {
          await cancelReservation(reservation.id);
          setSuccessMessage("Reserva cancelada.");
          setReloadToken((token) => token + 1);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível cancelar a reserva.");
        }
      },
    });
  }

  function handleBooked(reservation: ReservationResponse) {
    setSelectedAreaId(null);
    setTab("mine");
    setSuccessMessage(
      reservation.status === RESERVATION_STATUS.pending
        ? "Pedido enviado. Você recebe um aviso quando a gestão responder."
        : `Reserva confirmada.${reservation.chargeId ? " A taxa já está nos seus boletos." : ""}`,
    );
    setReloadToken((token) => token + 1);
  }

  return (
    <>
      <PageHeader overline={activeCondominium?.condominiumName} title="Reservas" />

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ? String(activeCondominiumId) : ""}
          onChange={(event) => {
            setSelectedAreaId(null);
            setActiveCondominiumId(Number(event.target.value));
          }}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
        />
      )}

      {errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-6 rounded-field bg-verde-suave px-4 py-3 text-sm font-medium text-verde-tinta">
          {successMessage}
        </p>
      )}

      {selectedArea && activeCondominiumId ? (
        <AreaBooking
          key={selectedArea.id}
          area={selectedArea}
          condominiumId={activeCondominiumId}
          units={allUnits.filter((unit) => unit.condominiumId === activeCondominiumId && (!selectedArea.buildingId || unit.buildingId === selectedArea.buildingId))}
          today={today}
          onBack={() => setSelectedAreaId(null)}
          onBooked={handleBooked}
        />
      ) : (
        <>
          <div role="tablist" aria-label="Reservas" className="mb-4 flex w-full rounded-block bg-menu p-1 sm:inline-flex sm:w-auto">
            {[
              { key: "book" as const, label: "Reservar", count: data.areas.length },
              { key: "mine" as const, label: "Minhas reservas", count: upcoming.length },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-field px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                  tab === item.key ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
                }`}
              >
                {item.label}
                <span className="text-xs font-medium tabular-nums text-tinta-suave">{isLoading ? "" : item.count}</span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="max-w-3xl rounded-card bg-superficie px-5 py-12 text-center text-sm text-tinta-suave shadow-whisper">Carregando…</p>
          ) : tab === "book" ? (
            data.areas.length === 0 ? (
              <Empty title="Nenhuma área para reservar." text="Quando a administração cadastrar o salão, a churrasqueira ou outras áreas, elas aparecem aqui." />
            ) : (
              <ul className="grid max-w-3xl gap-3 sm:grid-cols-2">
                {data.areas.map((area) => (
                  <li key={area.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessMessage("");
                        setSelectedAreaId(area.id);
                      }}
                      className="flex w-full items-center gap-4 rounded-card bg-superficie p-3 text-left shadow-whisper transition-colors hover:bg-campo/60"
                    >
                      <AreaPhoto area={area} className="size-20 shrink-0 rounded-block" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-semibold text-tinta">{area.name}</span>
                        <span className="block text-[13px] text-tinta-suave">
                          {[area.fullDay ? "Dia inteiro" : `${area.shifts.length} turno${area.shifts.length === 1 ? "" : "s"}`, area.fee ? formatCurrency(area.fee) : "Sem taxa", area.requiresApproval ? "com aprovação" : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="flex max-w-3xl flex-col gap-6">
              {upcoming.length === 0 ? (
                <Empty title="Nenhuma reserva marcada." text="Escolha uma área em “Reservar” para marcar um dia." />
              ) : (
                <ReservationList reservations={upcoming} today={today} onCancel={askCancel} />
              )}
              {history.length > 0 && (
                <section>
                  <h2 className="mb-2 px-1 font-display text-[17px] font-bold text-tinta">Histórico</h2>
                  <ReservationList reservations={history} today={today} />
                </section>
              )}
            </div>
          )}
        </>
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex max-w-3xl flex-col items-center gap-3 rounded-card bg-superficie px-6 py-12 text-center shadow-whisper">
      <span aria-hidden className="grid size-12 place-items-center rounded-block bg-campo text-tinta-suave">
        <Trees size={22} strokeWidth={1.8} />
      </span>
      <p className="text-[15px] font-semibold text-tinta">{title}</p>
      <p className="max-w-sm text-sm text-tinta-suave">{text}</p>
    </div>
  );
}

function ReservationList({ reservations, today, onCancel }: { reservations: ReservationResponse[]; today: string; onCancel?: (reservation: ReservationResponse) => void }) {
  return (
    <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
      {reservations.map((reservation) => (
        <li key={reservation.id} className="flex flex-col gap-2 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-tinta">{reservation.commonAreaName}</p>
              <p className="text-[13px] text-tinta-suave first-letter:uppercase">
                {formatDayHeading(reservation.date, today)} · {formatSlot(reservation)}
              </p>
            </div>
            <ReservationStatusChip status={reservation.status} />
          </div>
          {reservation.fee && (reservation.chargeId || reservation.status === RESERVATION_STATUS.pending) ? (
            <p className="text-[13px] text-tinta">
              Taxa de {formatCurrency(reservation.fee)}
              {reservation.chargeStatus === 2
                ? " · paga"
                : reservation.chargeStatus === 4
                  ? " · cancelada"
                  : reservation.chargeId
                    ? " · está nos seus boletos"
                    : " · entra nos boletos quando aprovada"}
              {onCancel && reservation.freeCancellationUntil && reservation.chargeStatus !== 2 && reservation.chargeStatus !== 4 && (
                <span className="text-tinta-suave">
                  {today <= reservation.freeCancellationUntil
                    ? ` · cancele sem custo até ${formatCalendarDate(reservation.freeCancellationUntil)}`
                    : " · prazo para cancelar sem custo encerrado"}
                </span>
              )}
            </p>
          ) : null}
          {reservation.rejectionReason && <p className="rounded-field bg-vermelho-suave px-3 py-2 text-[13px] text-vermelho">Motivo: {reservation.rejectionReason}</p>}
          {reservation.cancelReason && <p className="text-[13px] text-tinta-suave">Motivo do cancelamento: {reservation.cancelReason}</p>}
          {onCancel && reservation.canCancel && (
            <button
              type="button"
              onClick={() => onCancel(reservation)}
              className="self-start rounded-full px-0 py-1 text-sm font-semibold text-vermelho underline-offset-4 hover:underline"
            >
              Cancelar reserva
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

type AreaBookingProps = {
  area: CommonAreaResponse;
  condominiumId: number;
  units: MeUnitResponse[];
  today: string;
  onBack: () => void;
  onBooked: (reservation: ReservationResponse) => void;
};

function AreaBooking({ area, condominiumId, units, today, onBack, onBooked }: AreaBookingProps) {
  const [month, setMonth] = useState(today.slice(0, 7) + "-01");
  const [unitId, setUnitId] = useState<number | null>(units[0]?.unitId ?? null);
  const [availability, setAvailability] = useState<{ key: string; value: CommonAreaAvailability | null; error: string }>({ key: "", value: null, error: "" });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const effectiveUnitId = unitId ?? units[0]?.unitId ?? null;
  const key = `${area.id}|${month}|${effectiveUnitId}|${reloadToken}`;
  const isLoading = availability.key !== key;
  const current = isLoading ? null : availability.value;

  useEffect(() => {
    let isMounted = true;
    getAvailability(area.id, month.slice(0, 7), effectiveUnitId)
      .then((value) => isMounted && setAvailability({ key, value, error: "" }))
      .catch((error) => isMounted && setAvailability({ key, value: null, error: error instanceof Error ? error.message : "Não foi possível carregar os dias livres." }));
    return () => {
      isMounted = false;
    };
    // key already sums up every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const dayByDate = useMemo(() => new Map((current?.days ?? []).map((day) => [day.date, day])), [current]);
  const { from, to } = rangeOf("month", month);
  const calendarDays = daysBetween(from, to);
  const limitReached = Boolean(current?.monthlyLimitPerUnit && current.usedInMonth >= current.monthlyLimitPerUnit);
  const selectedDay = selectedDate ? dayByDate.get(selectedDate) : undefined;
  const firstMonth = today.slice(0, 7) + "-01";
  const lastMonth = current ? current.lastBookableDate.slice(0, 7) + "-01" : null;

  function changeMonth(delta: number) {
    setMonth(addMonths(month, delta));
    setSelectedDate(null);
    setSelectedSlot(null);
  }

  async function handleSubmit() {
    if (!selectedDate || !selectedSlot || !effectiveUnitId) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const reservation = await createReservation(condominiumId, {
        commonAreaId: area.id,
        unitId: effectiveUnitId,
        date: selectedDate,
        shiftId: selectedSlot.shiftId,
        acceptTerms,
        notes: notes.trim() || null,
      });
      onBooked(reservation);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Não foi possível reservar.");
      // Someone may have taken the slot: refresh the calendar.
      setSelectedSlot(null);
      setReloadToken((token) => token + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 self-start rounded-full py-1 pr-3 text-sm font-semibold text-tinta-suave hover:text-tinta">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        Todas as áreas
      </button>

      <section className="overflow-hidden rounded-card bg-superficie shadow-whisper">
        {area.hasPhoto && <AreaPhoto area={area} className="h-40 w-full sm:h-52" />}
        <div className="flex flex-col gap-2 p-5">
          <h2 className="font-display text-[22px] font-bold text-tinta">{area.name}</h2>
          {area.description && <p className="whitespace-pre-line text-sm text-tinta">{area.description}</p>}
          <ul className="flex flex-col gap-1 text-[13px] text-tinta-suave">
            {[...(area.capacity ? [`Até ${area.capacity} pessoas`] : []), ...describeRules(area)].map((rule) => (
              <li key={rule} className="flex gap-2">
                <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-tinta-suave" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {units.length > 1 && (
        <SelectField
          label="Reservar para"
          value={effectiveUnitId ? String(effectiveUnitId) : ""}
          onChange={(event) => {
            setUnitId(Number(event.target.value));
            setSelectedSlot(null);
          }}
          options={units.map((unit) => ({ value: String(unit.unitId), label: `${unit.buildingName}, unidade ${unit.unitNumber}` }))}
        />
      )}

      <section className="rounded-card bg-superficie p-4 shadow-whisper sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            disabled={month <= firstMonth}
            aria-label="Mês anterior"
            className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-campo hover:text-tinta disabled:opacity-30"
          >
            <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
          </button>
          <h3 aria-live="polite" className="font-display text-[18px] font-bold text-tinta">{rangeTitle("month", month)}</h3>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            disabled={lastMonth !== null && month >= lastMonth}
            aria-label="Próximo mês"
            className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-campo hover:text-tinta disabled:opacity-30"
          >
            <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        {availability.error && !isLoading && <p className="mb-3 rounded-field bg-vermelho-suave px-3 py-2 text-sm text-vermelho">{availability.error}</p>}
        {limitReached && (
          <p className="mb-3 rounded-field bg-ambar-suave px-3 py-2 text-[13px] text-ambar">
            Sua unidade já usou {current?.usedInMonth} de {current?.monthlyLimitPerUnit} reserva{current?.monthlyLimitPerUnit === 1 ? "" : "s"} desta área neste mês.
          </p>
        )}

        <div className="grid grid-cols-7 gap-1 text-center" aria-busy={isLoading}>
          {WEEKDAY_HEADERS.map((weekday) => (
            <span key={weekday} className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-tinta-suave">
              {weekday}
            </span>
          ))}
          {calendarDays.map((date) => {
            const day = dayByDate.get(date);
            const outside = date.slice(0, 7) !== month.slice(0, 7);
            const freeCount = day?.slots.filter((slot) => slot.isFree).length ?? 0;
            const mine = day?.slots.some((slot) => slot.isMine) ?? false;
            const bookable = Boolean(day?.inWindow && freeCount > 0 && !limitReached);
            const isSelected = date === selectedDate;

            if (outside) return <span key={date} aria-hidden />;

            return (
              <button
                key={date}
                type="button"
                disabled={!day?.inWindow && !mine}
                aria-pressed={isSelected}
                aria-label={`${formatCalendarDate(date)}: ${mine ? "sua reserva" : !day?.inWindow ? "fora do prazo" : freeCount ? `${freeCount} livre${freeCount === 1 ? "" : "s"}` : "lotado"}`}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                  setSubmitError("");
                }}
                className={`relative flex h-11 flex-col items-center justify-center rounded-field text-[15px] font-semibold tabular-nums transition-colors disabled:cursor-default ${
                  isSelected
                    ? "bg-tinta text-white"
                    : mine
                      ? "bg-verde-suave text-verde-tinta"
                      : bookable
                        ? "bg-campo text-tinta hover:bg-menu"
                        : day?.inWindow && freeCount === 0
                          ? "text-tinta-suave line-through"
                          : "text-tinta-suave/50"
                }`}
              >
                {Number(date.slice(8, 10))}
                {bookable && !isSelected && <span aria-hidden className="absolute bottom-1.5 size-1 rounded-full bg-verde" />}
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-tinta-suave">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-1.5 rounded-full bg-verde" /> tem horário livre</span>
          <span className="line-through">lotado</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-verde-suave" /> sua reserva</span>
        </p>
      </section>

      {selectedDate && selectedDay && (
        <section className="flex flex-col gap-4 rounded-card bg-superficie p-5 shadow-whisper">
          <h3 className="font-display text-[18px] font-bold text-tinta first-letter:uppercase">{formatDayHeading(selectedDate, today)}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {selectedDay.slots.map((slot) => {
              const isSelected = selectedSlot?.shiftId === slot.shiftId;
              const canPick = slot.isFree && selectedDay.inWindow && !limitReached;
              return (
                <button
                  key={slot.shiftId ?? "day"}
                  type="button"
                  disabled={!canPick}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedSlot(slot)}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-block px-4 py-3 text-left transition-colors ${
                    isSelected ? "bg-tinta text-white" : canPick ? "bg-campo text-tinta hover:bg-menu" : "bg-campo/50 text-tinta-suave"
                  }`}
                >
                  <span className="text-[15px] font-semibold">{formatSlot(slot)}</span>
                  <span className="text-xs font-medium">{slot.isMine ? "sua reserva" : !slot.isFree ? "reservado" : isSelected ? "escolhido" : canPick ? "livre" : "indisponível"}</span>
                </button>
              );
            })}
          </div>

          {selectedSlot && (
            <div className="flex flex-col gap-4 border-t border-linha pt-4">
              <p className="text-sm text-tinta">
                {area.requiresApproval ? "O pedido vai para a gestão aprovar." : "A reserva é confirmada na hora."}
                {area.fee
                  ? ` A taxa de ${formatCurrency(area.fee)} entra nos seus boletos${area.requiresApproval ? " quando for aprovada" : ""}, com vencimento no dia da reserva.`
                  : " Sem taxa."}
                {area.fee && area.freeCancellationDays !== null ? ` Cancelando até ${area.freeCancellationDays} dia${area.freeCancellationDays === 1 ? "" : "s"} antes, a taxa é cancelada.` : ""}
              </p>
              {area.terms && (
                <div className="rounded-block bg-campo p-4">
                  <p className="mb-2 text-sm font-semibold text-tinta">Termos de uso</p>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-line text-[13px] text-tinta">{area.terms}</p>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm font-semibold text-tinta">
                    <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-tinta" />
                    Li e aceito os termos de uso
                  </label>
                </div>
              )}
              <TextAreaField label="Observações (opcional)" rows={2} maxLength={500} placeholder="Ex.: aniversário, cerca de 30 convidados" value={notes} onChange={(event) => setNotes(event.target.value)} />
              {submitError && (
                <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
                  {submitError}
                </p>
              )}
              <Button fullWidth isLoading={isSubmitting} loadingText="Enviando…" disabled={Boolean(area.terms) && !acceptTerms} onClick={handleSubmit}>
                <CalendarCheck size={18} strokeWidth={1.8} aria-hidden />
                {area.requiresApproval ? "Pedir reserva" : "Reservar"}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
