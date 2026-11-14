import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarCheck, Check, Inbox, Pencil, Plus, Trash2, Trees, X } from "lucide-react";
import { useCondominium } from "../../app/providers/useCondominium";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog, type ConfirmRequest } from "../../shared/components/ConfirmDialog";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { todayInputDate } from "../../shared/lib/date";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import type { BuildingResponse } from "../buildings/types";
import { addDays, formatDayHeading } from "../visits/visitMeta";
import { AreaFormModal, AreaPhoto, ReasonModal, ReservationStatusChip } from "../reservations/ReservationParts";
import { RESERVATION_STATUS, describeRules, formatSlot } from "../reservations/reservationMeta";
import {
  approveReservation,
  cancelReservation,
  createCommonArea,
  deleteCommonArea,
  deleteCommonAreaPhoto,
  getCommonAreas,
  getReservations,
  rejectReservation,
  updateCommonArea,
  uploadCommonAreaPhoto,
} from "../reservations/reservationService";
import type { CommonAreaResponse, ReservationResponse, SaveCommonAreaRequest } from "../reservations/types";

type Tab = "pending" | "agenda" | "areas";

// Days of the agenda tab, from today.
const AGENDA_DAYS = 90;

type ReasonState = { reservation: ReservationResponse; mode: "reject" | "cancel" } | null;

// Management view (Admin; reused by the syndic with reservations.manage): pending requests,
// the upcoming agenda and the areas with their rules.
export function AdminReservationsPage() {
  const { condominiums, activeCondominium, activeCondominiumId, setActiveCondominiumId } = useCondominium();
  const today = todayInputDate();
  const [tab, setTab] = useState<Tab>("pending");
  const [data, setData] = useState<{ key: string; areas: CommonAreaResponse[]; reservations: ReservationResponse[] }>({ key: "", areas: [], reservations: [] });
  const [buildingsState, setBuildingsState] = useState<{ condominiumId: number | null; buildings: BuildingResponse[] }>({ condominiumId: null, buildings: [] });
  const [reloadToken, setReloadToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [formState, setFormState] = useState<{ area: CommonAreaResponse | null } | null>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonState, setReasonState] = useState<ReasonState>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  const requestKey = `${activeCondominiumId}|${reloadToken}`;
  const isLoading = data.key !== requestKey;
  const buildings = buildingsState.condominiumId === activeCondominiumId ? buildingsState.buildings : [];

  useEffect(() => {
    if (!activeCondominiumId) return;
    let isMounted = true;

    Promise.all([getCommonAreas(activeCondominiumId), getReservations(activeCondominiumId, { from: today, to: addDays(today, AGENDA_DAYS - 1) })])
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
    if (!activeCondominiumId) return;
    let isMounted = true;

    getBuildingsByCondominium(activeCondominiumId)
      .then((result) => isMounted && setBuildingsState({ condominiumId: activeCondominiumId, buildings: result }))
      .catch(() => isMounted && setBuildingsState({ condominiumId: activeCondominiumId, buildings: [] }));

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId]);

  const pending = data.reservations.filter((reservation) => reservation.status === RESERVATION_STATUS.pending);
  const agenda = data.reservations.filter(
    (reservation) =>
      (reservation.status === RESERVATION_STATUS.approved || reservation.status === RESERVATION_STATUS.pending) &&
      (!areaFilter || reservation.commonAreaId === Number(areaFilter)),
  );
  const agendaByDay = useMemo(() => {
    const groups = new Map<string, ReservationResponse[]>();
    for (const reservation of agenda) groups.set(reservation.date, [...(groups.get(reservation.date) ?? []), reservation]);
    return [...groups.entries()];
  }, [agenda]);

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "pending", label: "Pedidos pendentes", count: pending.length },
    { key: "agenda", label: "Agenda", count: agenda.length },
    { key: "areas", label: "Áreas", count: data.areas.length },
  ];

  function reload(message: string) {
    setSuccessMessage(message);
    setErrorMessage("");
    setReloadToken((token) => token + 1);
  }

  async function handleApprove(reservation: ReservationResponse) {
    setBusyId(reservation.id);
    setSuccessMessage("");
    try {
      const result = await approveReservation(reservation.id);
      reload(result.chargeId ? `Reserva aprovada. A taxa de ${formatCurrency(result.fee ?? 0)} foi lançada para a unidade.` : "Reserva aprovada. O morador foi avisado.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível aprovar a reserva.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReason(reason: string) {
    if (!reasonState) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      if (reasonState.mode === "reject") {
        await rejectReservation(reasonState.reservation.id, reason);
        reload("Pedido recusado. O morador recebeu o motivo.");
      } else {
        await cancelReservation(reasonState.reservation.id, reason);
        reload("Reserva cancelada. O horário ficou livre de novo.");
      }
      setReasonState(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível concluir.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAreaSubmit(request: SaveCommonAreaRequest, photo: File | null, removePhoto: boolean) {
    if (!activeCondominiumId) return;
    const editing = formState?.area;
    setIsSubmitting(true);
    setFormError("");

    try {
      const saved = editing ? await updateCommonArea(editing.id, request) : await createCommonArea(activeCondominiumId, request);
      if (photo) await uploadCommonAreaPhoto(saved.id, photo);
      else if (removePhoto) await deleteCommonAreaPhoto(saved.id);
      setFormState(null);
      reload(editing ? "Área atualizada." : "Área criada. Os moradores já podem reservar.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar a área.");
      // The area may have been saved before the photo failed: refresh the list behind the modal.
      setReloadToken((token) => token + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  function askDelete(area: CommonAreaResponse) {
    setConfirmRequest({
      title: `Excluir ${area.name}?`,
      description: "A área some da lista. Só dá para excluir áreas que nunca tiveram reservas; as outras podem ser desativadas na edição.",
      confirmLabel: "Excluir área",
      cancelLabel: "Voltar",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deleteCommonArea(area.id);
          reload("Área excluída.");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível excluir a área.");
        }
      },
    });
  }

  function openForm(area: CommonAreaResponse | null) {
    setFormError("");
    setSuccessMessage("");
    setFormState({ area });
  }

  function openReason(reservation: ReservationResponse, mode: "reject" | "cancel") {
    setFormError("");
    setSuccessMessage("");
    setReasonState({ reservation, mode });
  }

  return (
    <>
      <PageHeader overline={activeCondominium ? `${activeCondominium.condominiumName} · áreas comuns` : undefined} title="Reservas">
        <Button variant="quiet" size="sm" onClick={() => openForm(null)} disabled={!activeCondominiumId} className="bg-superficie shadow-whisper hover:bg-campo">
          <Plus size={16} strokeWidth={2} aria-hidden />
          <span className="max-sm:sr-only">Nova área</span>
        </Button>
      </PageHeader>

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ? String(activeCondominiumId) : ""}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
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

      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Reservas" className="flex w-full overflow-x-auto rounded-block bg-menu p-1 [scrollbar-width:none] sm:inline-flex sm:w-auto">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-field px-3.5 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                tab === item.key ? "bg-superficie text-tinta shadow-whisper" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {item.key === "pending" ? <span className="max-sm:hidden">{item.label}</span> : item.label}
              {item.key === "pending" && <span className="sm:hidden">Pendentes</span>}
              <span className={`text-xs font-medium tabular-nums ${item.key === "pending" && item.count ? "text-ambar" : "text-tinta-suave"}`}>{isLoading ? "" : item.count}</span>
            </button>
          ))}
        </div>

        {tab === "agenda" && data.areas.length > 1 && (
          <SelectField
            label="Área"
            className="w-full [&>label]:sr-only sm:w-56 [&_select]:bg-superficie [&_select]:py-2 [&_select]:text-sm [&_select]:shadow-whisper"
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value)}
            placeholder="Todas as áreas"
            options={data.areas.map((area) => ({ value: String(area.id), label: area.name }))}
          />
        )}
      </div>

      {isLoading ? (
        <p className="rounded-card bg-superficie px-5 py-12 text-center text-sm text-tinta-suave shadow-whisper">Carregando…</p>
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <EmptyState icon={<Inbox size={22} strokeWidth={1.8} />} title="Nenhum pedido esperando você." text="Quando um morador pedir uma área que precisa de aprovação, o pedido aparece aqui e no sininho." />
        ) : (
          <ul className="max-w-4xl divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
            {pending.map((reservation) => (
              <li key={reservation.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-tinta">
                    {reservation.commonAreaName} <span className="font-normal text-tinta-suave">· {formatDayHeading(reservation.date, today)}</span>
                  </p>
                  <p className="text-[13px] text-tinta-suave">
                    {[formatSlot(reservation), reservation.unitLabel, reservation.requestedByName, reservation.fee ? `taxa ${formatCurrency(reservation.fee)}` : null].filter(Boolean).join(" · ")}
                  </p>
                  {reservation.notes && <p className="mt-1 text-[13px] text-tinta">“{reservation.notes}”</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="quiet" onClick={() => openReason(reservation, "reject")} disabled={busyId !== null}>
                    <X size={15} strokeWidth={2} aria-hidden />
                    Recusar
                  </Button>
                  <Button size="sm" variant="accent" onClick={() => handleApprove(reservation)} isLoading={busyId === reservation.id} disabled={busyId !== null}>
                    <Check size={15} strokeWidth={2} aria-hidden />
                    Aprovar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : tab === "agenda" ? (
        agendaByDay.length === 0 ? (
          <EmptyState icon={<CalendarCheck size={22} strokeWidth={1.8} />} title="Nenhuma reserva nos próximos 90 dias." text="As reservas confirmadas e os pedidos pendentes aparecem aqui, dia a dia." />
        ) : (
          <div className="flex max-w-4xl flex-col gap-5">
            {agendaByDay.map(([date, items]) => (
              <section key={date}>
                <h2 className="mb-2 px-1 font-display text-[17px] font-bold text-tinta first-letter:uppercase">{formatDayHeading(date, today)}</h2>
                <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
                  {items.map((reservation) => (
                    <li key={reservation.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-tinta">{reservation.commonAreaName}</p>
                        <p className="truncate text-[13px] text-tinta-suave">{[formatSlot(reservation), reservation.unitLabel].join(" · ")}</p>
                      </div>
                      <ReservationStatusChip status={reservation.status} />
                      {reservation.canCancel && (
                        <button
                          type="button"
                          onClick={() => openReason(reservation, "cancel")}
                          aria-label={`Cancelar a reserva de ${reservation.commonAreaName}, ${reservation.unitLabel}`}
                          className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-vermelho-suave hover:text-vermelho"
                        >
                          <X size={17} strokeWidth={1.8} aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : data.areas.length === 0 ? (
        <EmptyState
          icon={<Trees size={22} strokeWidth={1.8} />}
          title="Nenhuma área cadastrada."
          text="Cadastre o salão, a churrasqueira ou a quadra com as regras de uso. Os moradores reservam pelo app."
          action={<Button size="sm" onClick={() => openForm(null)}>Cadastrar área</Button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.areas.map((area) => (
            <li key={area.id} className={`flex flex-col overflow-hidden rounded-card bg-superficie shadow-whisper ${area.isActive ? "" : "opacity-70"}`}>
              <AreaPhoto area={area} className="h-36 w-full" />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-[19px] font-bold text-tinta">{area.name}</h2>
                    <p className="text-[13px] text-tinta-suave">
                      {[area.buildingName ? `Só ${area.buildingName}` : "Todo o condomínio", area.capacity ? `até ${area.capacity} pessoas` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {!area.isActive ? (
                    <span className="shrink-0 rounded-chip bg-campo px-2 py-0.5 text-xs font-semibold text-tinta-suave">Inativa</span>
                  ) : area.pendingCount > 0 ? (
                    <span className="shrink-0 rounded-chip bg-ambar-suave px-2 py-0.5 text-xs font-semibold text-ambar">
                      {area.pendingCount} pendente{area.pendingCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-1 text-[13px] text-tinta">
                  {describeRules(area).map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-tinta-suave" />
                      {rule}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex gap-2 pt-1">
                  <Button size="sm" variant="quiet" onClick={() => openForm(area)}>
                    <Pencil size={15} strokeWidth={1.8} aria-hidden />
                    Editar
                  </Button>
                  <button
                    type="button"
                    onClick={() => askDelete(area)}
                    aria-label={`Excluir ${area.name}`}
                    className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-vermelho-suave hover:text-vermelho"
                  >
                    <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formState && (
        <AreaFormModal
          area={formState.area}
          buildings={buildings}
          errorMessage={formError}
          isSubmitting={isSubmitting}
          onClose={() => setFormState(null)}
          onSubmit={handleAreaSubmit}
        />
      )}

      {reasonState && (
        <ReasonModal
          title={reasonState.mode === "reject" ? "Recusar pedido" : "Cancelar reserva"}
          description={`${reasonState.reservation.commonAreaName}, ${formatDayHeading(reasonState.reservation.date, today).toLowerCase()} (${reasonState.reservation.shiftName}), ${reasonState.reservation.unitLabel}.${
            reasonState.mode === "cancel" && reasonState.reservation.chargeId && reasonState.reservation.chargeStatus !== 2 ? " A taxa em aberto também é cancelada." : ""
          }`}
          label={reasonState.mode === "reject" ? "Motivo (o morador vai ler)" : "Motivo (opcional, o morador vai ler)"}
          confirmLabel={reasonState.mode === "reject" ? "Recusar" : "Cancelar reserva"}
          required={reasonState.mode === "reject"}
          errorMessage={formError}
          isSubmitting={isSubmitting}
          onClose={() => setReasonState(null)}
          onSubmit={handleReason}
        />
      )}

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </>
  );
}

function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex max-w-4xl flex-col items-center gap-3 rounded-card bg-superficie px-6 py-12 text-center shadow-whisper">
      <span aria-hidden className="grid size-12 place-items-center rounded-block bg-campo text-tinta-suave">
        {icon}
      </span>
      <p className="text-[15px] font-semibold text-tinta">{title}</p>
      <p className="max-w-sm text-sm text-tinta-suave">{text}</p>
      {action}
    </div>
  );
}
