import { useEffect, useMemo, useState } from "react";
import { svgIcone } from "@edusites/icons/core";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { getMyCharges } from "../charges/chargeService";
import type { ChargeResponse } from "../charges/types";

export function ResidentBillsPage() {
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCharges() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setCharges(await getMyCharges());
      } catch (error) {
        setCharges([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar seus boletos.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCharges();
  }, []);

  const filteredCharges = useMemo(
    () =>
      charges.filter(
        (charge) => statusFilter === "all" || charge.status.toString() === statusFilter,
      ),
    [charges, statusFilter],
  );

  const pendingCharges = charges.filter((charge) => charge.status === 1);
  const paidCharges = charges.filter((charge) => charge.status === 2);
  const overdueCharges = charges.filter((charge) => charge.status === 3);
  const nextCharge = [...pendingCharges, ...overdueCharges].sort(
    (left, right) =>
      new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
  )[0];

  return (
    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5 border-b border-[#E5E7EB] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.38em] text-[#16A34A]">
            Financeiro
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
            Meus boletos
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280]">
            Acompanhe suas cobranças vinculadas às unidades do seu cadastro.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-12 min-w-44 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-black text-[#6B7280] outline-none transition hover:border-[#86EFAC] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
        >
          <option value="all">Todos</option>
          <option value="1">Pendentes</option>
          <option value="2">Pagos</option>
          <option value="3">Atrasados</option>
          <option value="4">Cancelados</option>
        </select>
      </div>

      {errorMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-3xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          <span className="mt-0.5 text-lg">
            <EduIcon nome="alerta" />
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1.9fr]">
        <NextChargeCard charge={nextCharge} isLoading={isLoading} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FinanceCard
            label="Em aberto"
            value={formatCurrency(sumCharges(pendingCharges))}
            helper={`${pendingCharges.length} cobrança(s) pendente(s)`}
            icon="boleto"
          />
          <FinanceCard
            label="Pagos"
            value={formatCurrency(sumCharges(paidCharges))}
            helper={`${paidCharges.length} cobrança(s) quitada(s)`}
            icon="check-redondo"
          />
          <FinanceCard
            label="Atrasados"
            value={formatCurrency(sumCharges(overdueCharges))}
            helper={`${overdueCharges.length} cobrança(s) vencida(s)`}
            icon="atencao"
            danger
          />
        </div>
      </div>

      <div className="mt-6 rounded-[1.8rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#111827]">Histórico de cobranças</h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              {filteredCharges.length} registro(s) encontrado(s)
            </p>
          </div>
        </div>

        {isLoading ? (
          <LoadingList />
        ) : filteredCharges.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {filteredCharges.map((charge) => (
              <ChargeRow key={charge.id} charge={charge} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type NextChargeCardProps = {
  charge?: ChargeResponse;
  isLoading: boolean;
};

function NextChargeCard({ charge, isLoading }: NextChargeCardProps) {
  if (isLoading) {
    return (
      <div className="min-h-52 animate-pulse rounded-[1.8rem] bg-[#F3F4F6]" />
    );
  }

  return (
    <article className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#0B3D2E] via-[#0D7A3A] to-[#22C55E] p-6 text-white shadow-xl shadow-[#0B3D2E]/15">
      <div className="absolute -right-16 -top-16 size-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-20 right-10 size-44 rounded-full bg-[#86EFAC]/20" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
            <EduIcon nome="boleto" />
          </div>
          {charge && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">
              {getChargeStatusLabel(charge.status)}
            </span>
          )}
        </div>

        <p className="mt-8 text-sm font-bold text-white/75">Próxima cobrança</p>

        {charge ? (
          <>
            <h2 className="mt-2 text-4xl font-black tracking-tight">
              {formatCurrency(charge.value)}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/80">
              Vence em {formatDate(charge.dueDate)} · {charge.description}
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Nenhuma cobrança pendente
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/80">
              Quando houver uma cobrança em aberto, ela aparecerá em destaque aqui.
            </p>
          </>
        )}
      </div>
    </article>
  );
}

type FinanceCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: string;
  danger?: boolean;
};

function FinanceCard({ label, value, helper, icon, danger = false }: FinanceCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 shadow-sm">
      <div
        className={`mb-5 flex size-11 items-center justify-center rounded-2xl text-xl ${
          danger ? "bg-[#FDECEC] text-[#EF4444]" : "bg-[#DCFCE7] text-[#16A34A]"
        }`}
      >
        <EduIcon nome={icon} />
      </div>
      <p className="text-sm font-extrabold text-[#6B7280]">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-[#111827]">{value}</p>
      <p className="mt-2 text-sm font-bold text-[#16A34A]">{helper}</p>
    </article>
  );
}

type ChargeRowProps = {
  charge: ChargeResponse;
};

function ChargeRow({ charge }: ChargeRowProps) {
  const unitLabel = [charge.buildingName, charge.unitNumber && `Unidade ${charge.unitNumber}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="grid grid-cols-1 gap-4 rounded-[1.35rem] border border-[#E5E7EB] bg-white p-4 transition hover:border-[#86EFAC] hover:shadow-lg hover:shadow-[#0B3D2E]/8 lg:grid-cols-[1.5fr_0.8fr_0.8fr_auto] lg:items-center">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#DCFCE7] text-xl text-[#16A34A]">
          <EduIcon nome="boleto" />
        </div>
        <div>
          <h3 className="font-black text-[#111827]">{charge.description}</h3>
          <p className="mt-1 text-sm font-semibold text-[#6B7280]">
            {unitLabel || charge.condominiumName}
          </p>
        </div>
      </div>

      <InfoColumn label="Valor" value={formatCurrency(charge.value)} />
      <InfoColumn label="Vencimento" value={formatDate(charge.dueDate)} />

      <div className="lg:justify-self-end">
        <StatusBadge
          label={getChargeStatusLabel(charge.status)}
          variant={getChargeStatusVariant(charge.status)}
        />
      </div>
    </article>
  );
}

type InfoColumnProps = {
  label: string;
  value: string;
};

function InfoColumn({ label, value }: InfoColumnProps) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#111827]">{value}</p>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-[1.35rem] border border-[#E5E7EB] bg-white"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#CBD5E1] bg-white px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#DCFCE7] text-2xl text-[#16A34A]">
        <EduIcon nome="boleto" />
      </div>
      <h2 className="mt-5 text-xl font-black text-[#111827]">
        Nenhuma cobrança encontrada
      </h2>
      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[#6B7280]">
        Ajuste o filtro ou aguarde uma nova cobrança vinculada à sua unidade.
      </p>
    </div>
  );
}

function EduIcon({ nome }: { nome: string }) {
  const [svg, setSvg] = useState<string | null>(() =>
    svgIcone({
      nome,
      cor: "currentColor",
      tamanho: "1em",
    }) ?? null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadIcon() {
      const icons = await import("@edusites/icons/core");
      const loadedSvg = await (icons as typeof icons & {
        svgIconeAsync?: (options: {
          nome: string;
          cor: string;
          tamanho: string;
        }) => Promise<string | null | undefined>;
      }).svgIconeAsync?.({
        nome,
        cor: "currentColor",
        tamanho: "1em",
      });

      if (isMounted) {
        setSvg(loadedSvg ?? null);
      }
    }

    if (!svg) {
      void loadIcon();
    }

    return () => {
      isMounted = false;
    };
  }, [nome, svg]);

  if (!svg) {
    return <span aria-hidden="true" className="inline-flex size-[1em]" />;
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex leading-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function sumCharges(charges: ChargeResponse[]) {
  return charges.reduce((total, charge) => total + charge.value, 0);
}

function getChargeStatusLabel(status: ChargeResponse["status"]) {
  if (status === 1) return "Pendente";
  if (status === 2) return "Pago";
  if (status === 3) return "Atrasado";
  if (status === 4) return "Cancelado";
  return "Indefinido";
}

function getChargeStatusVariant(status: ChargeResponse["status"]) {
  if (status === 2) return "success";
  if (status === 1) return "warning";
  if (status === 3) return "danger";
  return "neutral";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
