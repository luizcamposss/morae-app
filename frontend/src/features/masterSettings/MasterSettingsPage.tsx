const settingSections = [
    {
        title: "Identidade da plataforma",
        description: "Dados visuais e institucionais usados na experiência Master.",
        items: ["Nome do app", "Paleta visual", "Logo e assinatura"],
    },
    {
        title: "Segurança",
        description: "Preferências planejadas para proteger o acesso administrativo.",
        items: ["Política de senha", "Sessões ativas", "Auditoria de acesso"],
    },
    {
        title: "Notificações",
        description: "Canais que o Master poderá configurar para relacionamento.",
        items: ["Convites enviados", "Alertas de condomínio", "Resumo operacional"],
    },
    {
        title: "Permissões Master",
        description: "Escopo de atuação do Master sem acessar dados internos do condomínio.",
        items: ["Condomínios", "Administradores", "Contatos institucionais"],
    },
];

const preferences = [
    {
        label: "Usar saudação personalizada",
        enabled: true,
    },
    {
        label: "Exibir data no dashboard",
        enabled: true,
    },
    {
        label: "Solicitar confirmação em ações sensíveis",
        enabled: true,
    },
    {
        label: "Receber resumo semanal da plataforma",
        enabled: false,
    },
];

const masterScopeBlocks = [
    {
        title: "Plataforma",
        description: "Configura identidade, segurança e preferências gerais.",
    },
    {
        title: "Condomínios",
        description: "Gerencia cadastros e relacionamento institucional.",
    },
    {
        title: "Contatos",
        description: "Acompanha administradores e canais de comunicação.",
    },
    {
        title: "Limite",
        description: "Não acessa unidades, moradores ou rotina operacional.",
    },
];

export function MasterSettingsPage() {
    return (
        <div className="space-y-7">
            <header>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#16A34A]">
                    Configurações
                </p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-[#111827]">
                    Preferências do Master
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280]">
                    Tela visual para organizar as configurações importantes da plataforma.
                    A integração com o backend será feita em uma próxima etapa.
                </p>
            </header>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black text-[#111827]">
                            Áreas configuráveis
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Módulos que fazem sentido para o painel Master.
                        </p>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {settingSections.map((section) => (
                            <article
                                key={section.title}
                                className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5"
                            >
                                <h3 className="text-lg font-black text-[#111827]">
                                    {section.title}
                                </h3>
                                <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280]">
                                    {section.description}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {section.items.map((item) => (
                                        <span
                                            key={item}
                                            className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#0B3D2E] ring-1 ring-[#E5E7EB]"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </div>

                <aside className="space-y-5">
                    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-black text-[#111827]">
                            Preferências rápidas
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                            Apenas visual por enquanto.
                        </p>

                        <div className="mt-6 space-y-3">
                            {preferences.map((preference) => (
                                <div
                                    key={preference.label}
                                    className="flex items-center justify-between gap-4 rounded-2xl bg-[#F3F4F6] px-4 py-3"
                                >
                                    <span className="text-sm font-extrabold text-[#111827]">
                                        {preference.label}
                                    </span>
                                    <span
                                        className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
                                            preference.enabled
                                                ? "justify-end bg-[#16A34A]"
                                                : "justify-start bg-[#D1D5DB]"
                                        }`}
                                    >
                                        <span className="size-5 rounded-full bg-white shadow-sm" />
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-[#BBF7D0] bg-[#DCFCE7] p-6">
                        <h2 className="text-xl font-black text-[#0B3D2E]">
                            Regra do Master
                        </h2>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {masterScopeBlocks.map((block) => (
                                <article
                                    key={block.title}
                                    className="rounded-2xl bg-white/75 p-4 ring-1 ring-white"
                                >
                                    <h3 className="text-sm font-black text-[#0B3D2E]">
                                        {block.title}
                                    </h3>
                                    <p className="mt-1 text-xs font-bold leading-5 text-[#0B3D2E]/75">
                                        {block.description}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>
                </aside>
            </section>
        </div>
    );
}
