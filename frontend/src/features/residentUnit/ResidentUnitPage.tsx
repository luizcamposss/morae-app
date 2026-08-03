import { useEffect, useState } from "react";
import { svgIcone } from "@edusites/icons/core";
import { getMyUnits } from "../me/meService";
import type { MeUnitResponse } from "../me/types";

export function ResidentUnitPage() {
  const [units, setUnits] = useState<MeUnitResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadUnits() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setUnits(await getMyUnits());
      } catch (error) {
        setUnits([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar suas unidades.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadUnits();
  }, []);

  return (
    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
      <div className="border-b border-[#E5E7EB] pb-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.38em] text-[#16A34A]">
            Área do morador
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
            {units.length > 1 ? "Minhas unidades" : "Minha unidade"}
          </h1>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-3xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          <span className="mt-0.5 text-lg">
            <EduIcon nome="alerta" />
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <LoadingState />
        ) : units.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {units.map((unit) => (
              <UnitCard key={unit.unitId} unit={unit} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type UnitCardProps = {
  unit: MeUnitResponse;
};

function UnitCard({ unit }: UnitCardProps) {
  return (
    <article className="overflow-hidden rounded-[1.8rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#0B3D2E]/8">
      <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#DCFCE7] text-2xl text-[#16A34A]">
            <EduIcon nome="apartamento" />
          </div>
          <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-black text-[#0B3D2E]">
            {getRelationshipLabel(unit.relationshipType)}
          </span>
        </div>

        <p className="mt-6 text-sm font-bold text-[#6B7280]">{unit.buildingName}</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-[#111827]">
          Unidade {unit.unitNumber}
        </h2>
        <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[#4B5563]">
          {unit.condominiumName}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailItem icon="predio" label="Prédio" value={unit.buildingName} />
        <DetailItem icon="apartamento" label="Unidade" value={unit.unitNumber} />
        <DetailItem
          icon="dashboard"
          label="Tipo"
          value={getUnitTypeLabel(unit.unitType)}
        />
        <DetailItem
          icon="usuario"
          label="Vínculo"
          value={getRelationshipLabel(unit.relationshipType)}
        />
      </div>
    </article>
  );
}

type DetailItemProps = {
  icon: string;
  label: string;
  value: string;
};

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-[#DCFCE7] text-lg text-[#16A34A]">
        <EduIcon nome={icon} />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-[#111827]">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="h-80 animate-pulse rounded-[1.8rem] border border-[#E5E7EB] bg-[#F3F4F6]"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-[#CBD5E1] bg-[#F9FAFB] px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#DCFCE7] text-2xl text-[#16A34A]">
        <EduIcon nome="apartamento" />
      </div>
      <h2 className="mt-5 text-xl font-black text-[#111827]">
        Nenhuma unidade vinculada
      </h2>
      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[#6B7280]">
        Quando uma unidade for associada ao seu cadastro, ela aparecerá aqui
        automaticamente.
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

function getUnitTypeLabel(unitType: number) {
  if (unitType === 1) return "Apartamento";
  if (unitType === 2) return "Casa";
  if (unitType === 3) return "Sala comercial";
  if (unitType === 4) return "Loja";
  return "Não informado";
}

function getRelationshipLabel(relationshipType: number) {
  if (relationshipType === 1) return "Proprietário";
  if (relationshipType === 2) return "Morador";
  if (relationshipType === 3) return "Inquilino";
  return "Não informado";
}
