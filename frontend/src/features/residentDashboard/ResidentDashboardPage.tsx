import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Megaphone, Vote } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { SelectField } from "../../shared/components/SelectField";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDateTime, getGreeting, todayInputDate } from "../../shared/lib/date";
import { isOpenCharge } from "../adminPayments/chargeForm";
import { getAssemblies } from "../assemblies/assemblyService";
import { getMyCharges } from "../charges/chargeService";
import { getDocuments } from "../documents/documentService";
import { categoryLabel } from "../documents/documentMeta";
import { NEWS_PRIORITY } from "../news/newsPriority";
import { getNewsByCondominium } from "../news/newsService";
import { NextChargeCard } from "../residentBills/NextChargeCard";
import { nextOpenCharge, type BillsLocationState } from "../residentBills/residentBills";
import { describeDay } from "../syndicDashboard/syndicDashboard";
import { describeSchedule, describeTime, formatDayHeading, isRecurring, visitorTypeMeta } from "../visits/visitMeta";
import { getMyVisits } from "../visits/visitService";
import { useEnabledModules } from "../modules/modules";
import {
  emptyResidentDashboard,
  getLatestNews,
  getNewDocuments,
  getOpenAssembly,
  getUpcomingVisits,
  type ResidentDashboardData,
} from "./residentDashboard";

type LoadedDashboard = { condominiumId: number; data: ResidentDashboardData; errorMessage: string };

// Each list fails on its own: one missing block should not hide the rest of the Início.
function orNull<T>(promise: Promise<T>) {
  return promise.catch(() => null);
}

// Início of the resident, made for the phone: what to pay, what to vote and what is new.
export function ResidentDashboardPage() {
  const { user } = useAuth();
  const { activeCondominium, activeCondominiumId, condominiums, setActiveCondominiumId } = useCondominium();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<LoadedDashboard | null>(null);
  const isModuleOn = useEnabledModules();
  const hasAssemblies = isModuleOn("assemblies");
  const hasDocuments = isModuleOn("documents");
  const hasVisitors = isModuleOn("visitors");

  useEffect(() => {
    if (!activeCondominiumId) {
      return;
    }

    let isMounted = true;

    Promise.all([
      getMyCharges(),
      // Modules turned off are not asked for (their cards stay hidden).
      hasAssemblies ? orNull(getAssemblies(activeCondominiumId)) : null,
      orNull(getNewsByCondominium(activeCondominiumId)),
      hasDocuments ? orNull(getDocuments(activeCondominiumId)) : null,
      hasVisitors ? orNull(getMyVisits(activeCondominiumId)) : null,
    ])
      .then(([charges, assemblies, news, documents, visits]) => ({
        data: { charges: charges.filter((charge) => charge.condominiumId === activeCondominiumId), assemblies, news, documents, visits },
        errorMessage: "",
      }))
      .catch((error) => ({
        data: emptyResidentDashboard,
        errorMessage: error instanceof Error ? error.message : "Não foi possível carregar o início.",
      }))
      .then((result) => {
        if (isMounted) setLoaded({ condominiumId: activeCondominiumId, ...result });
      });

    return () => {
      isMounted = false;
    };
  }, [activeCondominiumId, hasAssemblies, hasDocuments, hasVisitors]);

  const isLoading = !loaded || loaded.condominiumId !== activeCondominiumId;
  const { charges, assemblies, news, documents, visits } = isLoading ? emptyResidentDashboard : loaded.data;
  const today = todayInputDate();
  const nextCharge = nextOpenCharge(charges);
  const openCount = charges.filter(isOpenCharge).length;
  const openAssembly = assemblies ? getOpenAssembly(assemblies) : undefined;
  const latestNews = news ? getLatestNews(news) : [];
  const newDocuments = documents ? getNewDocuments(documents, today) : [];
  const upcomingVisits = visits ? getUpcomingVisits(visits, today) : [];
  const firstName = (user?.personName ?? "").trim().split(/\s+/)[0];

  return (
    <>
      <PageHeader
        overline={["Morador", activeCondominium?.condominiumName].filter(Boolean).join(" · ")}
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

      {!isLoading && loaded.errorMessage && (
        <p role="alert" className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
          {loaded.errorMessage}
        </p>
      )}

      {!activeCondominiumId ? (
        <EmptyCard text="Seu usuário ainda não tem acesso ativo a um condomínio." />
      ) : (
        <div className="grid gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="space-y-10">
            <section>
              <SectionTitle title="Para pagar" />
              <NextChargeCard
                charge={nextCharge}
                isLoading={isLoading}
                otherOpenCount={Math.max(openCount - 1, 0)}
                onPay={(charge) => navigate("/resident/bills", { state: { payChargeId: charge.id } satisfies BillsLocationState })}
                onDetails={() => navigate("/resident/bills")}
              />
            </section>

            {openAssembly && (
              <section>
                <SectionTitle title="Assembleia" />
                <GroupedList>
                  <GroupedRow
                    icon={Vote}
                    tone="green"
                    title={openAssembly.title}
                    subtitle={`Votação aberta até ${formatDateTime(openAssembly.votingEndsAt)}`}
                  />
                </GroupedList>
              </section>
            )}

            <section>
              <SectionTitle title="Últimos avisos" />
              {isLoading ? (
                <EmptyCard text="Carregando…" />
              ) : latestNews.length === 0 ? (
                <EmptyCard text="Nenhum aviso publicado ainda." />
              ) : (
                <GroupedList>
                  {latestNews.map((item) => (
                    <GroupedRow
                      key={item.id}
                      icon={Megaphone}
                      tone={item.priority === NEWS_PRIORITY.high ? "amber" : "green"}
                      title={item.title}
                      subtitle={`Publicado ${describeDay(item.createdAt)}`}
                      onClick={() => navigate("/resident/notices")}
                    />
                  ))}
                </GroupedList>
              )}
            </section>
          </div>

          <div className="space-y-10">
            {hasVisitors && <section>
              <SectionTitle title="Próximas visitas" />
              {isLoading ? (
                <EmptyCard text="Carregando…" />
              ) : upcomingVisits.length === 0 ? (
                <EmptyCard text="Nenhuma visita agendada." />
              ) : (
                <GroupedList>
                  {upcomingVisits.map(({ visit, nextDate }) => (
                    <GroupedRow
                      key={visit.id}
                      icon={visitorTypeMeta(visit.visitorType).icon}
                      title={visit.visitorName}
                      subtitle={`${isRecurring(visit) ? describeSchedule(visit) : formatDayHeading(nextDate, today)} · ${describeTime(visit)}`}
                      onClick={() => navigate("/resident/visits")}
                    />
                  ))}
                </GroupedList>
              )}
            </section>}

            {newDocuments.length > 0 && (
              <section>
                <SectionTitle title="Documentos novos" />
                <GroupedList>
                  {newDocuments.map((document) => (
                    <GroupedRow
                      key={document.id}
                      icon={FileText}
                      title={document.title}
                      subtitle={`${categoryLabel(document.category)} · publicado ${describeDay(document.createdAt)}`}
                      onClick={() => navigate("/resident/documents")}
                    />
                  ))}
                </GroupedList>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 font-display text-[21px] font-bold tracking-[-0.01em] text-tinta">{title}</h2>;
}

function EmptyCard({ text }: { text: string }) {
  return <p className="rounded-card bg-superficie px-5 py-6 text-center text-sm text-tinta-suave shadow-whisper">{text}</p>;
}
