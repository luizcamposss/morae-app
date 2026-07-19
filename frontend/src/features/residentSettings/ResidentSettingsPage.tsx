import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../app/providers/useAuth";
import { getMyUnits } from "../me/meService";
import type { MeUnitResponse } from "../me/types";

type ModalType = "data" | "notifications" | null;

const settings = [
  {
    label: "Dados pessoais",
    description: "Nome, e-mail e vínculos do seu cadastro",
    modal: "data" as const,
  },
  {
    label: "Notificações",
    description: "Preferências serão habilitadas em um próximo módulo",
    modal: "notifications" as const,
  },
];

export function ResidentSettingsPage() {
  const { user } = useAuth();
  const [modal, setModal] = useState<ModalType>(null);
  const [units, setUnits] = useState<MeUnitResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadUnits() {
      try {
        setErrorMessage("");
        setUnits(await getMyUnits());
      } catch (error) {
        setUnits([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar suas unidades.",
        );
      }
    }

    void loadUnits();
  }, []);

  return (
    <>
      <section className="min-h-[620px] rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
            Configurações
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#6B7280]">
            Dados do seu perfil no MORAÊ.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
            {errorMessage}
          </div>
        )}

        <div className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2">
          {settings.map((setting) => (
            <button
              key={setting.label}
              type="button"
              onClick={() => setModal(setting.modal)}
              className="min-h-40 cursor-pointer rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#86EFAC] hover:bg-[#DCFCE7] hover:shadow-md"
            >
              <span className="block text-2xl font-extrabold text-[#111827]">
                {setting.label}
              </span>
              <span className="mt-3 block text-sm font-semibold text-[#6B7280]">
                {setting.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      {modal === "data" && (
        <DataModal userName={user?.personName} email={user?.email} units={units} onClose={() => setModal(null)} />
      )}
      {modal === "notifications" && <NotificationsModal onClose={() => setModal(null)} />}
    </>
  );
}

type ModalProps = {
  onClose: () => void;
};

function ModalShell({
  title,
  children,
  onClose,
}: ModalProps & { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
          <h2 className="text-2xl font-extrabold text-[#111827]">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            x
          </button>
        </div>

        <div className="px-8 py-7">{children}</div>
      </div>
    </div>
  );
}

function DataModal({
  userName,
  email,
  units,
  onClose,
}: ModalProps & {
  userName?: string;
  email?: string;
  units: MeUnitResponse[];
}) {
  return (
    <ModalShell title="Dados pessoais" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Nome" value={userName ?? "Não informado"} />
          <Field label="E-mail" value={email ?? "Não informado"} />
        </div>

        <div className="rounded-2xl bg-[#F3F4F6] p-5">
          <p className="text-sm font-extrabold text-[#111827]">Unidades vinculadas</p>
          <div className="mt-4 space-y-3">
            {units.length === 0 ? (
              <p className="text-sm font-bold text-[#6B7280]">
                Nenhuma unidade vinculada ao seu cadastro.
              </p>
            ) : (
              units.map((unit) => (
                <div key={unit.unitId} className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-sm font-bold text-[#111827]">
                    {unit.buildingName} - Unidade {unit.unitNumber}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                    {unit.condominiumName}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#6B7280]">
          Edição de dados pessoais será conectada quando o backend tiver um endpoint próprio
          para atualização do perfil.
        </p>
      </div>
    </ModalShell>
  );
}

function NotificationsModal({ onClose }: ModalProps) {
  return (
    <ModalShell title="Notificações" onClose={onClose}>
      <div className="space-y-6">
        <div className="rounded-2xl bg-[#F3F4F6] p-5">
          <p className="text-sm font-extrabold text-[#111827]">Preferências em breve</p>
          <p className="mt-2 text-sm font-semibold text-[#6B7280]">
            Esse bloco está preparado visualmente, mas ainda não salva alterações porque não
            existe endpoint de preferências no backend.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

type FieldProps = {
  label: string;
  value: string;
};

function Field({ label, value }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">{label}</span>
      <input
        value={value}
        readOnly
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none"
      />
    </label>
  );
}
