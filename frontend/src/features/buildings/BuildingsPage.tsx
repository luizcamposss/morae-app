import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "../../shared/components/MetricCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import type { BuildingResponse } from "./types";
import { createBuilding, getBuildingsByCondominium, updateBuilding } from "./buildingService";
import { getMyCondominiums } from "../me/meService";
import type { MeCondominiumResponse } from "../me/types";

export function BuildingsPage() {
    const navigate = useNavigate();
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingBuilding, setEditingBuilding] = useState<BuildingResponse | null>(null)
    const [viewingBuilding, setViewingBuilding] = useState<BuildingResponse | null>(null)
    const [buildings, setBuildings] = useState<BuildingResponse[]>([]);
    const [condominiums, setCondominiums] = useState<MeCondominiumResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCondominiumId, setActiveCondominiumId] = useState<number | null>(null);

    const filteredBuildings = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) {
            return buildings;
        }

        return buildings.filter((building) =>
            building.name.toLowerCase().includes(normalizedSearch) ||
            building.code.toLowerCase().includes(normalizedSearch),
        );
    }, [buildings, searchTerm]);

    const totalBuildings = buildings.length;

    const totalUnits = buildings.reduce(
        (sum, building) => sum + building.unitCount,
        0,
    );

    const occupiedBuildings = buildings.filter(
        (building) => building.occupiedUnitCount > 0,
    ).length;

    const attentionBuildings = buildings.filter(
        (building) => building.status === "Atencao",
    ).length;

    const metrics = [
        {
            label: "Total",
            value: totalBuildings.toString(),
            helper: "Predios cadastrados",
        },
        {
            label: "Ocupados",
            value: occupiedBuildings.toString(),
            helper: "Com unidades ocupadas",
        },
        {
            label: "Em atencao",
            value: attentionBuildings.toString(),
            helper: "Sem ocupacao",
        },
        {
            label: "Unidades",
            value: totalUnits.toString(),
            helper: "Distribuidas nos predios",
        },
    ];

    async function loadBuildings(condominiumId: number) {
        try {
            setErrorMessage("");
            const result = await getBuildingsByCondominium(condominiumId);
            setBuildings(result);
        } catch (error) {
            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("Nao foi possivel carregar os predios.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        async function initializeBuildingsPage() {
            setIsLoading(true);

            try {
                const myCondominiums = await getMyCondominiums();
                setCondominiums(myCondominiums);

                const adminCondominium = myCondominiums.find((condominium) => condominium.role === "Admin");
                const selectedCondominium = adminCondominium ?? myCondominiums[0];

                if (!selectedCondominium) {
                    setErrorMessage("Nenhum condominio disponivel para este usuario.");
                    setBuildings([]);
                    return;
                }

                setActiveCondominiumId(selectedCondominium.condominiumId);
                await loadBuildings(selectedCondominium.condominiumId);
            } catch (error) {
                if (error instanceof Error) {
                    setErrorMessage(error.message);
                } else {
                    setErrorMessage("Nao foi possivel carregar os condominios.");
                }
            }
        }

        void initializeBuildingsPage();
    }, []);

    function handleUnits(buildingId: number) {
        navigate(`/admin/units?buildingId=${buildingId}`);
    }

    function handleSyndicAssignment() {
        setSuccessMessage("A definicao de sindico por predio ainda nao esta modelada no backend.");
    }
    return (
        <>
            <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                            Predios
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Controle os predios e blocos do condominio.
                        </p>
                        {condominiums.length > 0 && activeCondominiumId && (
                            <p className="mt-2 text-sm font-semibold text-[#16A34A]">
                                Condominio ativo: {condominiums.find((condominium) => condominium.condominiumId === activeCondominiumId)?.condominiumName}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                    >
                        + Novo Predio
                    </button>
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
                            placeholder="Buscar predio..."
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
                            Carregando predios...
                        </p>
                    )}

                    {errorMessage && (
                        <p className="mb-4 text-sm font-semibold text-[#B42318]">
                            {errorMessage}
                        </p>
                    )}

                    {successMessage && (
                        <p className="mb-4 text-sm font-semibold text-[#16A34A]">
                            {successMessage}
                        </p>
                    )}

                    {!isLoading && filteredBuildings.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center">
                            <p className="text-lg font-extrabold text-[#111827]">
                                {searchTerm ? "Nenhum predio encontrado" : "Nenhum predio cadastrado"}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                                {searchTerm
                                    ? "Tente outro nome ou codigo para localizar o predio."
                                    : "Cadastre o primeiro predio para comecar a organizar o condominio."}
                            </p>
                            {!searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(true)}
                                    className="mt-6 h-11 rounded-2xl bg-[#16A34A] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#16A34A]/30 transition hover:bg-[#0B3D2E]"
                                >
                                    + Novo Predio
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="bg-[#DCFCE7] text-xs uppercase tracking-wide text-[#0B3D2E]">
                                    <tr>
                                        <th className="px-4 py-3 font-extrabold">Predio</th>
                                        <th className="px-4 py-3 font-extrabold">Unidades</th>
                                        <th className="px-4 py-3 font-extrabold">Moradores</th>
                                        <th className="px-4 py-3 font-extrabold">Status</th>
                                        <th className="px-4 py-3 font-extrabold">Acoes</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-[#E5E7EB]">
                                    {filteredBuildings.map((building) => (
                                        <tr key={building.id} className="transition hover:bg-[#F3F4F6]">
                                            <td className="px-4 py-4 font-extrabold text-[#111827]">
                                                <div>{building.name}</div>
                                                <div className="mt-1 text-xs font-semibold text-[#6B7280]">
                                                    {building.code}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                {building.unitCount}
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-[#6B7280]">
                                                {building.residentCount}
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge
                                                    label={building.status}
                                                    variant={building.status === "Ativo" ? "success" : "warning"}
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingBuilding(building)}
                                                        className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                    >
                                                        Ver
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingBuilding(building)}
                                                        className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSyndicAssignment}
                                                        className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                    >
                                                        Definir sindico
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnits(building.id)}
                                                        className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] transition hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                                    >
                                                        Unidades
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
                        Acoes planejadas: ver detalhes, editar, definir sindico e abrir unidades do predio.
                    </p>
                </div>
            </section>

            {isCreateOpen && (
                <CreateBuildingModal
                    condominiumId={activeCondominiumId ?? 0}
                    onClose={() => setIsCreateOpen(false)}
                    onCreated={() => loadBuildings(activeCondominiumId ?? 0)}
                    onSuccess={(message) => setSuccessMessage(message)}
                />
            )}

            {editingBuilding && (
                <EditBuildingModal
                    building={editingBuilding}
                    onClose={() => setEditingBuilding(null)}
                    onUpdated={() => loadBuildings(activeCondominiumId ?? 0)}
                    onSuccess={(message) => setSuccessMessage(message)}
                />
            )}

            {viewingBuilding && (
                <ViewBuildingModal
                    building={viewingBuilding}
                    onClose={() => setViewingBuilding(null)}
                />
            )}
        </>
    )
}

type ModalProps = {
    onClose: () => void
}

type CreateBuildingModalProps = {
    condominiumId: number
    onClose: () => void
    onCreated: () => Promise<void>
    onSuccess: (message: string) => void
}

type EditBuildingModalProps = {
    building: BuildingResponse
    onClose: () => void
    onUpdated: () => Promise<void>
    onSuccess: (message: string) => void
}

type ViewBuildingModalProps = {
    building: BuildingResponse
    onClose: () => void
}

function ModalShell({ title, children, onClose }: ModalProps & { title: string; children: ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-6 py-8 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                    <h2 className="text-2xl font-extrabold text-[#111827]">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
                    >
                        x
                    </button>
                </div>

                <div className="px-8 py-7">
                    {children}
                </div>
            </div>
        </div>
    )
}

function CreateBuildingModal({
    condominiumId,
    onClose,
    onCreated,
    onSuccess,
}: CreateBuildingModalProps) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            await createBuilding(condominiumId, {
                name,
                code,
            });

            await onCreated();
            onSuccess("Predio cadastrado com sucesso.");
            onClose();
        } catch (error) {
            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("Nao foi possivel cadastrar o predio.");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ModalShell title="Cadastrar Novo Predio" onClose={onClose}>
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field
                        label="Nome do predio"
                        value={name}
                        onChange={setName}
                        placeholder="Predio A"
                    />
                    <Field
                        label="Codigo/identificacao"
                        value={code}
                        onChange={setCode}
                        placeholder="BLOCO-A"
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
                    {isSubmitting ? "Cadastrando..." : "Cadastrar"}
                </button>
            </form>
        </ModalShell>
    )
}

function EditBuildingModal({
    building,
    onClose,
    onUpdated,
    onSuccess,
}: EditBuildingModalProps) {
    const [name, setName] = useState(building.name);
    const [code, setCode] = useState(building.code);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            await updateBuilding(building.id, {
                name,
                code,
            });

            await onUpdated();
            onSuccess("Predio atualizado com sucesso.");
            onClose();
        } catch (error) {
            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("Nao foi possivel atualizar o predio.");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ModalShell title="Editar Predio" onClose={onClose}>
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field
                        label="Nome do predio"
                        value={name}
                        onChange={setName}
                        placeholder="Predio A"
                    />
                    <Field
                        label="Codigo/identificacao"
                        value={code}
                        onChange={setCode}
                        placeholder="BLOCO-A"
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
                    {isSubmitting ? "Salvando..." : "Salvar alteracoes"}
                </button>
            </form>
        </ModalShell>
    )
}

function ViewBuildingModal({
    building,
    onClose,
}: ViewBuildingModalProps) {
    return (
        <ModalShell title="Detalhes do Predio" onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <ReadOnlyField label="Nome do predio" value={building.name} />
                    <ReadOnlyField label="Codigo" value={building.code} />
                    <ReadOnlyField label="Unidades" value={building.unitCount.toString()} />
                    <ReadOnlyField label="Moradores vinculados" value={building.residentCount.toString()} />
                    <ReadOnlyField label="Unidades ocupadas" value={building.occupiedUnitCount.toString()} />
                    <ReadOnlyField label="Status" value={building.status} />
                </div>

                <ReadOnlyField
                    label="Criado em"
                    value={new Date(building.createdAt).toLocaleString("pt-BR")}
                />
            </div>
        </ModalShell>
    )
}

type FieldProps = {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

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
    )
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
    )
}
