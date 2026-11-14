import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Building2, Megaphone, Receipt, TriangleAlert, X } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { SelectField } from "../../shared/components/SelectField";
import { SummaryCard, type SummaryItem } from "../../shared/components/SummaryCard";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatCurrency } from "../../shared/lib/currency";
import { getGreeting } from "../../shared/lib/date";
import { getBuildingsByCondominium } from "../buildings/buildingService";
import { getChargesByCondominium } from "../charges/chargeService";
import { countRemindersToday, describeReminders } from "../charges/reminders";
import { getNewsByCondominium } from "../news/newsService";
import { getOccurrencesByCondominium } from "../occurrences/occurrenceService";
import { useModuleEnabled } from "../modules/modules";
import { getUnitsByBuilding } from "../units/unitService";
import { UnitBillingGrid } from "../billingGrid/UnitBillingGrid";
import { useSyndicAccess } from "../syndicAccess/useSyndicAccess";
import {
  describeBuildings,
  describeDay,
  emptyDashboard,
  getLatestNews,
  getOpenOccurrences,
  listUnits,
  plural,
  summarizeBuildings,
  summarizeOverdue,
  type SyndicDashboardData,
} from "./syndicDashboard";

type LoadedDashboard = { condominiumId: number; data: SyndicDashboardData; errorMessage: string };

// Início of the syndic: numbers and "today" list only for the areas the Admin granted.
export function SyndicDashboardPage() {
  const { user } = useAuth();
  const { activeCondominium, activeCondominiumId, condominiums, setActiveCondominiumId } = useCondominium();
  const access = useSyndicAccess();
  const hasOccurrences = useModuleEnabled("occurrences");
  const navigate = useNavigate();
  const location = useLocation();
  const deniedScreen = (location.state as { deniedScreen?: string } | null)?.deniedScreen;
  const [loaded, setLoaded] = useState<LoadedDashboard | null>(null);

  useEffect(() => {
    if (!activeCondominiumId || !access) {
      return;
    }

    let isMounted = true;

    // Each list is only requested when the syndic may see it (the API would answer 403).
    // Finance also lists his buildings and units (for the charges grid).
    Promise.all([
      access.residents || access.finance ? getBuildingsByCondominium(activeCondominiumId) : null,
      access.finance ? getChargesByCondominium(activeCondominiumId) : null,
      access.maintenance && hasOccurrences ? getOccurrencesByCondominium(activeCondominiumId) : null,
      access.communication ? getNewsByCondominium(activeCondominiumId) : null,
    ])
      .then(async ([buildings, charges, occurrences, news]) => {
        const units = access.finance && buildings ? (await Promise.all(buildings.map((building) => getUnitsByBuilding(building.id)))).flat() : null;
        return { data: { buildings: access.residents ? buildings : null, charges, occurrences, news, units }, errorMessage: "" };
      })
      .catch((error) => ({
        data: emptyDashboard,
        errorMessage: error instanceof Error ? error.message : "Não foi possível carregar o início.",
      }))
      .then((result) => {
        if (isMounted) setLoaded({ condominiumId: activeCondominiumId, ...result });
      });

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, access, hasOccurrences]);

  const isLoading = !loaded || loaded.condominiumId !== activeCondominiumId;
  const { buildings, charges, occurrences, news, units } = isLoading ? emptyDashboard : loaded.data;
  const scope = buildings ? describeBuildings(buildings) : "";
  const totals = buildings ? summarizeBuildings(buildings) : null;
  const overdue = charges ? summarizeOverdue(charges, (buildings?.length ?? 0) !== 1) : null;
  const openOccurrences = occurrences ? getOpenOccurrences(occurrences) : null;
  const latestNews = news ? getLatestNews(news) : null;
  const firstName = (user?.personName ?? "").trim().split(/\s+/)[0];
  const dash = "–";

  const summaryItems: SummaryItem[] = [];

  if (access?.finance) {
    // "Unidades em dia" lives in the billing grid below; the summary keeps only the money.
    summaryItems.push({
      label: "Em atraso",
      value: isLoading ? dash : formatCurrency(overdue?.value ?? 0),
      detail: overdue?.unitLabels.length ? plural(overdue.unitLabels.length, "unidade", "unidades") : "nenhuma unidade",
      tone: overdue?.value ? "danger" : "neutral",
    });
  } else if (totals) {
    summaryItems.push(
      { label: "Unidades ocupadas", value: isLoading ? dash : `${totals.occupied} de ${totals.units}`, detail: scope || "unidades" },
      { label: "Moradores", value: isLoading ? dash : String(totals.residents), detail: scope ? `em ${scope}` : "cadastrados" },
    );
  }

  const todayRows: ReactNode[] = [];

  if (overdue) {
    todayRows.push(
      overdue.count > 0 ? (
        <GroupedRow
          key="charges"
          icon={Receipt}
          tone="red"
          title={plural(overdue.count, "cobrança atrasada", "cobranças atrasadas")}
          subtitle={listUnits(overdue.unitLabels) || formatCurrency(overdue.value)}
          onClick={() => navigate("/syndic/payments")}
        />
      ) : (
        <GroupedRow key="charges" icon={Receipt} tone="green" title="Cobranças em dia" subtitle="Nenhuma cobrança atrasada" onClick={() => navigate("/syndic/payments")} />
      ),
    );
  }

  const reminders = charges ? countRemindersToday(charges) : null;
  if (reminders?.total) {
    todayRows.push(
      <GroupedRow
        key="reminders"
        icon={Bell}
        title={`${plural(reminders.total, "lembrete enviado", "lembretes enviados")} hoje`}
        subtitle={describeReminders(reminders)}
        onClick={() => navigate("/syndic/payments")}
      />,
    );
  }

  if (openOccurrences) {
    todayRows.push(
      openOccurrences.length > 0 ? (
        <GroupedRow
          key="occurrences"
          icon={TriangleAlert}
          tone="amber"
          title={plural(openOccurrences.length, "ocorrência aberta", "ocorrências abertas")}
          subtitle={openOccurrences.slice(0, 2).map((occurrence) => occurrence.title).join(" · ")}
          onClick={() => navigate("/syndic/occurrences")}
        />
      ) : (
        <GroupedRow key="occurrences" icon={TriangleAlert} tone="green" title="Nenhuma ocorrência aberta" subtitle="Tudo resolvido por aqui" onClick={() => navigate("/syndic/occurrences")} />
      ),
    );
  }

  if (news) {
    todayRows.push(
      latestNews ? (
        <GroupedRow
          key="news"
          icon={Megaphone}
          tone="green"
          title={`Aviso publicado ${describeDay(latestNews.createdAt)}`}
          subtitle={latestNews.title}
          onClick={() => navigate("/syndic/news")}
        />
      ) : (
        <GroupedRow key="news" icon={Megaphone} title="Nenhum aviso publicado" subtitle="Publique o primeiro aviso para os moradores" onClick={() => navigate("/syndic/news")} />
      ),
    );
  }

  const hasNoArea = access && !access.residents && !access.finance && !access.communication && !access.maintenance;

  return (
    <>
      <PageHeader
        overline={["Síndico", activeCondominium?.condominiumName, scope].filter(Boolean).join(" · ")}
        title={firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
      />

      {condominiums.length > 1 && (
        <SelectField
          label="Condomínio"
          className="mb-6 lg:hidden"
          value={activeCondominiumId ?? ""}
          onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
          options={condominiums.map((condominium) => ({ value: String(condominium.condominiumId), label: condominium.condominiumName }))}
        />
      )}

      {deniedScreen && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-field bg-ambar-suave px-4 py-3 text-sm text-tinta">
          <p className="flex-1">
            <span className="font-semibold">Você não tem acesso a {deniedScreen}.</span> A administração do condomínio escolhe as áreas
            liberadas para o síndico.
          </p>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => navigate(location.pathname, { replace: true, state: null })}
            className="-m-1 rounded-chip p-1 text-tinta-suave transition-colors hover:text-tinta"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}

      {!isLoading && loaded.errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {loaded.errorMessage}
        </p>
      )}

      {summaryItems.length > 0 && <SummaryCard items={summaryItems} />}

      <div className={`mt-10 grid gap-x-6 gap-y-10 ${buildings ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]" : ""}`}>
        <section className="min-w-0">
          <SectionTitle title="Hoje" note={scope} />
          {!activeCondominiumId ? (
            <EmptyCard text="Seu usuário ainda não tem acesso ativo a um condomínio." />
          ) : hasNoArea ? (
            <EmptyCard text="A administração ainda não liberou nenhuma área para você." />
          ) : isLoading ? (
            <EmptyCard text="Carregando…" />
          ) : (
            <GroupedList>{todayRows}</GroupedList>
          )}
        </section>

        {buildings && (
          <section>
            <SectionTitle title={buildings.length === 1 ? "Seu prédio" : "Seus prédios"} />
            {buildings.length === 0 ? (
              <EmptyCard text="Nenhum prédio ligado a você ainda." />
            ) : (
              <GroupedList>
                {buildings.map((building) => (
                  <GroupedRow
                    key={building.id}
                    icon={Building2}
                    tone="green"
                    title={building.name}
                    subtitle={`${building.occupiedUnitCount} de ${plural(building.unitCount, "unidade ocupada", "unidades ocupadas")} · ${plural(building.residentCount, "morador", "moradores")}`}
                  />
                ))}
              </GroupedList>
            )}
          </section>
        )}
      </div>

      {access?.finance && activeCondominiumId && (
        <div className="mt-10">
          <UnitBillingGrid units={units ?? []} charges={charges ?? []} paymentsPath="/syndic/payments" isLoading={isLoading} />
        </div>
      )}

      <p className="mt-8 text-[13px] text-tinta-suave">O menu mostra só o que a administração liberou para você.</p>
    </>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <h2 className="mb-3 font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">
      {title}
      {note && <span className="ml-2 font-sans text-[13px] font-normal tracking-normal text-tinta-suave">{note}</span>}
    </h2>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <p className="rounded-card bg-superficie px-5 py-6 text-center text-sm text-tinta-suave shadow-whisper">{text}</p>;
}
