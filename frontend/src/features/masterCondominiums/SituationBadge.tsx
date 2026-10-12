import type { Situation } from "./condominiumBilling";

const situations: Record<Situation, { label: string; chip: string; tile: string }> = {
    ok: { label: "Em dia", chip: "bg-verde-suave text-verde-tinta", tile: "bg-verde-suave text-verde-tinta" },
    late: { label: "Mensalidade atrasada", chip: "bg-vermelho-suave text-vermelho", tile: "bg-vermelho-suave text-vermelho" },
    inactive: { label: "Inativo", chip: "bg-campo text-tinta-suave", tile: "bg-campo text-tinta-suave" },
};

export function SituationChip({ situation }: { situation: Situation }) {
    const { label, chip } = situations[situation];
    return <span className={`shrink-0 rounded-chip px-2 py-0.5 text-xs font-semibold ${chip}`}>{label}</span>;
}

// Initial of the name, tinted by the situation so the list can be read at a glance.
export function SituationTile({ name, situation, size = "md" }: { name: string; situation: Situation; size?: "md" | "lg" }) {
    return (
        <span
            aria-hidden
            className={`grid shrink-0 place-items-center font-display font-bold ${situations[situation].tile} ${
                size === "lg" ? "size-12 rounded-block text-xl" : "size-10 rounded-field text-base"
            }`}
        >
            {name.trim().charAt(0).toUpperCase()}
        </span>
    );
}
