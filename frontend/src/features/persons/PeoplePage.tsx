import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCondominium } from "../../app/providers/useCondominium";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import {
  createPersonInCondominium,
  getPersonsByCondominium,
  updatePersonInCondominium,
} from "./personService";
import type { CreatePersonRequest, PersonResponse } from "./types";

const emptyForm: CreatePersonRequest = {
  name: "",
  cpf: "",
  phoneNumber: "",
};

export function PeoplePage() {
  const {
    condominiums,
    activeCondominium,
    activeCondominiumId,
    isLoading: isLoadingCondominiums,
    errorMessage: condominiumErrorMessage,
    setActiveCondominiumId,
  } = useCondominium();

  const [people, setPeople] = useState<PersonResponse[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonResponse | null>(null);
  const [viewingPerson, setViewingPerson] = useState<PersonResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filteredPeople = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return people;
    }

    return people.filter((person) =>
      person.name.toLowerCase().includes(normalizedSearch) ||
      person.cpf.includes(normalizedSearch) ||
      person.phoneNumber.includes(normalizedSearch) ||
      person.mainUnit.toLowerCase().includes(normalizedSearch),
    );
  }, [people, searchTerm]);

  const totalPeople = people.length;
  const linkedPeople = people.filter((person) => person.unitCount > 0).length;
  const unlinkedPeople = totalPeople - linkedPeople;
  const totalUnitLinks = people.reduce((sum, person) => sum + person.unitCount, 0);

  const metrics = [
    { label: "Total", value: totalPeople.toString(), helper: "Pessoas cadastradas" },
    { label: "Com unidade", value: linkedPeople.toString(), helper: "Ja vinculadas" },
    { label: "Sem unidade", value: unlinkedPeople.toString(), helper: "Aguardando vinculo" },
    { label: "Vinculos", value: totalUnitLinks.toString(), helper: "Pessoa-unidade" },
  ];

  async function loadPeople(condominiumId: number) {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      setIsLoadingPeople(true);

      const result = await getPersonsByCondominium(condominiumId);
      setPeople(result);
    } catch (error) {
      setPeople([]);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel carregar os moradores.");
      }
    } finally {
      setIsLoadingPeople(false);
    }
  }

  async function refreshPeople() {
    if (!activeCondominiumId) {
      return;
    }

    await loadPeople(activeCondominiumId);
  }

  useEffect(() => {
    if (!activeCondominiumId) {
      setPeople([]);
      setIsLoadingPeople(false);
      return;
    }

    void loadPeople(activeCondominiumId);
  }, [activeCondominiumId]);

  const isLoading = isLoadingCondominiums || isLoadingPeople;
  const pageErrorMessage = condominiumErrorMessage || errorMessage;

  return (
    <>
      <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
              Moradores
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Cadastre pessoas, acompanhe vinculos e prepare convites de acesso.
            </p>
            {activeCondominium && (
              <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                Condominio ativo: {activeCondominium.condominiumName}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            {condominiums.length > 1 && (
              <select
                value={activeCondominiumId ?? ""}
                onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
                className="h-11 min-w-72 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
              >
                {condominiums.map((condominium) => (
                  <option
                    key={condominium.condominiumId}
                    value={condominium.condominiumId}
                  >
                    {condominium.condominiumName}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              disabled={!activeCondominiumId}
              onClick={() => setIsCreateOpen(true)}
              className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
            >
              + Novo Morador
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
            />
          ))}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <input
              type="search"
              placeholder="Buscar morador, CPF, telefone ou unidade..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
            />

            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="h-11 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
            >
              Todos
            </button>
          </div>

          {isLoading && (
            <p className="mb-4 text-sm font-semibold text-[#6B7280]">
              Carregando moradores...
            </p>
          )}

          {pageErrorMessage && (
            <p className="mb-4 text-sm font-semibold text-[#B42318]">
              {pageErrorMessage}
            </p>
          )}

          {successMessage && (
            <p className="mb-4 text-sm font-semibold text-[#16A34A]">
              {successMessage}
            </p>
          )}

          {!isLoading && filteredPeople.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center">
              <p className="text-lg font-extrabold text-[#111827]">
                {searchTerm ? "Nenhum morador encontrado" : "Nenhum morador cadastrado"}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                {searchTerm
                  ? "Tente outro termo para localizar a pessoa."
                  : "Cadastre a primeira pessoa antes de vincular unidades ou enviar convites."}
              </p>
              {!searchTerm && activeCondominiumId && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-6 h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                >
                  + Novo Morador
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Pessoa</th>
                    <th className="px-4 py-3 font-extrabold">Contato</th>
                    <th className="px-4 py-3 font-extrabold">Unidade principal</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-4 py-3 font-extrabold">Acoes</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredPeople.map((person) => (
                    <tr key={person.id} className="transition hover:bg-[#F3F4F6]">
                      <td className="px-4 py-4 font-extrabold text-[#111827]">
                        <div>{person.name}</div>
                        <div className="mt-1 text-xs font-semibold text-[#6B7280]">
                          CPF {person.cpf}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {person.phoneNumber}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#6B7280]">
                        {person.mainUnit || "Sem unidade vinculada"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          label={person.unitCount > 0 ? "Vinculado" : "Sem unidade"}
                          variant={person.unitCount > 0 ? "success" : "warning"}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingPerson(person)}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPerson(person)}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setSuccessMessage("Convites entram no proximo modulo.")}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                          >
                            Preparar convite
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-sm font-semibold text-[#6B7280]">
            Este modulo cadastra pessoas no condominio ativo. O vinculo com unidade continua no modulo de unidades.
          </p>
        </div>
      </section>

      {isCreateOpen && activeCondominiumId && (
        <PersonFormModal
          title="Novo Morador"
          submitLabel="Cadastrar morador"
          initialForm={emptyForm}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (form) => {
            await createPersonInCondominium(activeCondominiumId, form);
            await refreshPeople();
            setSuccessMessage("Morador cadastrado com sucesso.");
          }}
        />
      )}

      {editingPerson && activeCondominiumId && (
        <PersonFormModal
          title="Editar Morador"
          submitLabel="Salvar alteracoes"
          initialForm={{
            name: editingPerson.name,
            cpf: editingPerson.cpf,
            phoneNumber: editingPerson.phoneNumber,
          }}
          onClose={() => setEditingPerson(null)}
          onSubmit={async (form) => {
            await updatePersonInCondominium(activeCondominiumId, editingPerson.id, form);
            await refreshPeople();
            setSuccessMessage("Morador atualizado com sucesso.");
          }}
        />
      )}

      {viewingPerson && (
        <PersonDetailsModal
          person={viewingPerson}
          onClose={() => setViewingPerson(null)}
        />
      )}
    </>
  );
}

type PersonFormModalProps = {
  title: string;
  submitLabel: string;
  initialForm: CreatePersonRequest;
  onClose: () => void;
  onSubmit: (form: CreatePersonRequest) => Promise<void>;
};

function PersonFormModal({
  title,
  submitLabel,
  initialForm,
  onClose,
  onSubmit,
}: PersonFormModalProps) {
  const [form, setForm] = useState<CreatePersonRequest>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField<K extends keyof CreatePersonRequest>(
    field: K,
    value: CreatePersonRequest[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel salvar o morador.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Nome"
            value={form.name}
            onChange={(value) => updateField("name", value)}
            placeholder="Nome completo"
          />
          <Field
            label="CPF"
            value={form.cpf}
            onChange={(value) => updateField("cpf", onlyDigits(value, 11))}
            placeholder="Somente numeros"
          />
          <Field
            label="Telefone"
            value={form.phoneNumber}
            onChange={(value) => updateField("phoneNumber", onlyDigits(value, 20))}
            placeholder="11999999999"
          />
        </div>

        {errorMessage && (
          <p className="text-sm font-semibold text-[#B42318]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </form>
    </ModalShell>
  );
}

function PersonDetailsModal({
  person,
  onClose,
}: {
  person: PersonResponse;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Detalhes do Morador" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReadOnlyField label="Nome" value={person.name} />
          <ReadOnlyField label="CPF" value={person.cpf} />
          <ReadOnlyField label="Telefone" value={person.phoneNumber} />
          <ReadOnlyField
            label="Condominio"
            value={person.condominiumName || "Nao informado"}
          />
          <ReadOnlyField
            label="Unidade principal"
            value={person.mainUnit || "Sem unidade vinculada"}
          />
          <ReadOnlyField
            label="Total de vinculos"
            value={person.unitCount.toString()}
          />
        </div>

        <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#0B3D2E]">
            Proximo passo
          </h3>
          <p className="mt-2 text-sm font-semibold text-[#6B7280]">
            Convites de acesso serao conectados no proximo modulo, usando esta pessoa como base.
          </p>
        </section>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
          <h2 className="text-xl font-extrabold text-[#111827]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#F3F4F6] px-3 py-1 text-sm font-extrabold text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            Fechar
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function Field({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        readOnly
        className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm font-bold text-[#111827] outline-none"
      />
    </label>
  );
}

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}
