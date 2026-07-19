import { useEffect, useState, type ReactNode } from "react";
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
          error instanceof Error ? error.message : "Não foi possível carregar suas unidades.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadUnits();
  }, []);

  return (
    <section className="min-h-[620px] rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
          Minha unidade
        </h1>
        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
          Unidades vinculadas ao seu cadastro.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
          {errorMessage}
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {isLoading ? (
          <InfoPanel title="Carregando">
            <InfoLine label="Status" value="Buscando unidades no backend" />
          </InfoPanel>
        ) : units.length === 0 ? (
          <InfoPanel title="Nenhuma unidade">
            <InfoLine label="Status" value="Nenhuma unidade vinculada ao seu usuário" />
          </InfoPanel>
        ) : (
          units.map((unit) => (
            <InfoPanel key={unit.unitId} title={`${unit.buildingName} - Unidade ${unit.unitNumber}`}>
              <InfoLine label="Condomínio" value={unit.condominiumName} />
              <InfoLine label="Prédio" value={unit.buildingName} />
              <InfoLine label="Unidade" value={unit.unitNumber} />
              <InfoLine label="Tipo" value={getUnitTypeLabel(unit.unitType)} />
              <InfoLine label="Vínculo" value={getRelationshipLabel(unit.relationshipType)} />
            </InfoPanel>
          ))
        )}
      </div>
    </section>
  );
}

type InfoPanelProps = {
  title: string;
  children: ReactNode;
};

function InfoPanel({ title, children }: InfoPanelProps) {
  return (
    <section className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
      <h2 className="mb-4 text-lg font-extrabold text-[#111827]">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

type InfoLineProps = {
  label: string;
  value: string;
};

function InfoLine({ label, value }: InfoLineProps) {
  return (
    <p className="text-sm font-bold text-[#111827]">
      <span className="text-[#6B7280]">{label}: </span>
      {value}
    </p>
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
