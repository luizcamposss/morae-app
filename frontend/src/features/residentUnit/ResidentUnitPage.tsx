const linkedPeople = [
    'Maria Souza - Moradora principal',
    'Carlos Souza - Morador',
    'Joao Souza - Dependente',
]

export function ResidentUnitPage() {
    return (
        <section className="min-h-[620px] rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                    Minha unidade
                </h1>
                <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                    Predio A - Apto 101
                </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <InfoPanel title="Dados da unidade">
                    <InfoLine label="Condominio" value="Jardim Sul" />
                    <InfoLine label="Predio" value="Predio A" />
                    <InfoLine label="Unidade" value="Apto 101" />
                    <InfoLine label="Tipo" value="Apartamento" />
                    <InfoLine label="Status" value="Ocupado" />
                </InfoPanel>

                <InfoPanel title="Pessoas vinculadas">
                    <div className="space-y-2">
                        {linkedPeople.map((person) => (
                            <p key={person} className="text-sm font-bold text-[#111827]">
                                {person}
                            </p>
                        ))}
                    </div>
                </InfoPanel>
            </div>

            <div className="mt-10">
                <InfoPanel title="Responsaveis">
                    <InfoLine label="Sindico do predio" value="Joao Silva" />
                    <InfoLine label="Administrador do condominio" value="Carlos Almeida" />
                </InfoPanel>
            </div>
        </section>
    )
}

type InfoPanelProps = {
    title: string
    children: React.ReactNode
}

function InfoPanel({ title, children }: InfoPanelProps) {
    return (
        <section className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F3F4F6] p-6">
            <h2 className="mb-4 text-lg font-extrabold text-[#111827]">
                {title}
            </h2>
            {children}
        </section>
    )
}

type InfoLineProps = {
    label: string
    value: string
}

function InfoLine({ label, value }: InfoLineProps) {
    return (
        <p className="text-sm font-bold text-[#111827]">
            <span className="text-[#6B7280]">{label}: </span>
            {value}
        </p>
    )
}
