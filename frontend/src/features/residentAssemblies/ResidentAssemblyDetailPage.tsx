import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MoraeMark } from "../../shared/components/MoraeMark";
import { PageHeader } from "../../shared/layout/PageHeader";
import { formatDateTime } from "../../shared/lib/date";
import { ASSEMBLY_PHASE, assemblyTypeLabel, describeVoting, participationPercent, voterRuleLabel } from "../assemblies/assemblyMeta";
import { ItemCard, PhaseChip, ResultCard } from "../assemblies/AssemblyParts";
import { getAssembly, getAssemblyResults, getMyBallot } from "../assemblies/assemblyService";
import type { AssemblyResponse, AssemblyResults, MyBallot } from "../assemblies/types";
import { downloadDocument } from "../documents/documentService";
import { AssemblyBallot } from "./AssemblyBallot";

type Loaded = { id: number; assembly: AssemblyResponse | null; ballot: MyBallot | null; results: AssemblyResults | null; errorMessage: string };

// Open: the ballot. Closed: the final result (asking for it also closes an assembly past its end).
async function loadAssembly(id: number) {
  const assembly = await getAssembly(id);
  if (assembly.phase === ASSEMBLY_PHASE.open) return { assembly, ballot: await getMyBallot(id), results: null };
  if (assembly.phase !== ASSEMBLY_PHASE.closed) return { assembly, ballot: null, results: null };
  const results = await getAssemblyResults(id);
  return { assembly: assembly.closedAt ? assembly : await getAssembly(id), ballot: null, results };
}

// One assembly for the resident; also the target of the notification links (/resident/assemblies/:id).
export function ResidentAssemblyDetailPage() {
  const id = Number(useParams().id);
  const [loaded, setLoaded] = useState<Loaded>({ id: 0, assembly: null, ballot: null, results: null, errorMessage: "" });
  const [downloadError, setDownloadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadAssembly(id)
      .then((next) => isMounted && setLoaded({ id, ...next, errorMessage: "" }))
      .catch(
        (error) =>
          isMounted &&
          setLoaded({
            id,
            assembly: null,
            ballot: null,
            results: null,
            errorMessage: error instanceof Error ? error.message : "Não foi possível carregar a assembleia.",
          }),
      );

    return () => {
      isMounted = false;
    };
  }, [id]);

  const isLoading = loaded.id !== id;
  const assembly = isLoading ? null : loaded.assembly;
  const { ballot, results } = loaded;

  async function handleDownloadMinutes(documentId: number, title: string) {
    setDownloadError("");
    setIsDownloading(true);
    try {
      await downloadDocument({ id: documentId, fileName: title });
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Não foi possível baixar a ata.");
    } finally {
      setIsDownloading(false);
    }
  }

  const backLink = (
    <Link to=".." relative="path" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-tinta-suave transition-colors hover:text-tinta">
      <ArrowLeft size={16} strokeWidth={2} aria-hidden />
      Assembleias
    </Link>
  );

  if (!assembly) {
    return (
      <>
        {backLink}
        <div className="flex flex-col items-center rounded-card bg-superficie px-5 py-12 text-center shadow-whisper">
          {isLoading ? (
            <span className="flex items-center gap-2 text-sm text-tinta-suave">
              <MoraeMark size={18} motion="respiro" />
              Carregando assembleia…
            </span>
          ) : (
            <span role="alert" className="text-sm text-tinta-suave">
              {loaded.errorMessage}
            </span>
          )}
        </div>
      </>
    );
  }

  const phase = assembly.phase;
  const items = assembly.items ?? [];
  const minutesId = results?.minutesDocumentId ?? assembly.minutesDocumentId;
  const minutesTitle = results?.minutesDocumentTitle ?? "Ata da assembleia";

  return (
    <>
      {backLink}
      <PageHeader overline={`Assembleia ${assemblyTypeLabel(assembly.type).toLowerCase()} · ${describeVoting(assembly)}`} title={assembly.title} />

      {phase === ASSEMBLY_PHASE.canceled && (
        <p className="mb-6 rounded-field bg-vermelho-suave px-4 py-3 text-sm text-vermelho">
          <span className="font-semibold">Cancelada em {formatDateTime(assembly.canceledAt)}.</span> {assembly.cancelReason}
        </p>
      )}
      {phase === ASSEMBLY_PHASE.scheduled && (
        <p className="mb-6 rounded-field bg-ambar-suave px-4 py-3 text-sm text-ambar">
          <span className="font-semibold">A votação abre em {formatDateTime(assembly.votingStartsAt)}.</span> Até lá, confira as pautas abaixo.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <section aria-labelledby="items-title">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="items-title" className="font-display text-xl font-bold tracking-[-0.01em] text-tinta">
              {results ? "Resultado" : ballot ? "Sua cédula" : "Pautas"}
            </h2>
            {results && (
              <span className="text-[13px] tabular-nums text-tinta-suave">
                {participationPercent(results.votedUnits, results.eligibleUnits)}% de participação · {results.votedUnits} de {results.eligibleUnits}{" "}
                {results.eligibleUnits === 1 ? "unidade" : "unidades"}
              </span>
            )}
          </div>

          {ballot ? (
            <AssemblyBallot
              assemblyId={assembly.id}
              items={items}
              ballot={ballot}
              votingEndsAt={assembly.votingEndsAt}
              onVoted={(next) => setLoaded((current) => ({ ...current, ballot: next }))}
            />
          ) : (
            <ol className="flex flex-col gap-3">
              {results ? results.items.map((item) => <ResultCard key={item.itemId} item={item} />) : items.map((item) => <ItemCard key={item.id} item={item} />)}
            </ol>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-card bg-superficie p-5 shadow-whisper">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[17px] font-bold text-tinta">Detalhes</h2>
              <PhaseChip phase={phase} />
            </div>
            <dl className="mt-3 divide-y divide-linha text-sm">
              {[
                ["Quem vota", voterRuleLabel(assembly.voterRule)],
                ["Votação", `${formatDateTime(assembly.votingStartsAt)} a ${formatDateTime(assembly.votingEndsAt)}`],
                ["Reunião", assembly.meetingAt ? formatDateTime(assembly.meetingAt) : null],
                ["Local", assembly.meetingLocation],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-tinta-suave">{label}</dt>
                    <dd className="text-right font-medium text-tinta">{value}</dd>
                  </div>
                ))}
            </dl>
            {assembly.description && <p className="mt-3 whitespace-pre-line border-t border-linha pt-3 text-sm text-tinta-suave">{assembly.description}</p>}
          </section>

          {phase === ASSEMBLY_PHASE.closed && minutesId && (
            <section className="rounded-card bg-superficie p-5 shadow-whisper">
              <h2 className="font-display text-[17px] font-bold text-tinta">Ata</h2>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-block bg-verde-suave text-verde-tinta">
                  <FileText size={18} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta">{minutesTitle}</span>
                <button
                  type="button"
                  onClick={() => void handleDownloadMinutes(minutesId, minutesTitle)}
                  disabled={isDownloading}
                  aria-label="Baixar a ata"
                  className="grid size-10 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-menu hover:text-tinta disabled:cursor-progress"
                >
                  {isDownloading ? <MoraeMark size={18} motion="respiro" /> : <Download size={18} strokeWidth={1.8} aria-hidden />}
                </button>
              </div>
              {downloadError && (
                <p role="alert" className="mt-3 text-[13px] font-medium text-vermelho">
                  {downloadError}
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
