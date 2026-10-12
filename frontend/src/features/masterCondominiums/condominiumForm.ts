import type {
    CondominiumResponse,
    CreateCondominiumOnboardingRequest,
    CreateCondominiumRequest,
    UpdateCondominiumRequest,
} from "../condominiums/types";
import type { MasterUserResponse } from "../masterUsers/types";

// Form types, validation, input masks and API mapping of the Master condominiums screen.
export const ACTIVE_STATUS = 1;
export const INACTIVE_STATUS = 2;
export const PENDING_INVITATION_STATUS = 1;
export const ADMIN_ROLE = 2;

export const BRAZILIAN_STATES = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export type ViaCepResponse = {
    cep: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
};

export type ModalMode = "create" | "edit" | null;

export type FormState = {
    name: string;
    cnpj: string;
    cep: string;
    number: string;
    address: string;
    city: string;
    state: string;
    emailContact: string;
    status: number;
    adminName: string;
    adminCpf: string;
    adminPhoneNumber: string;
    adminEmail: string;
    linkedAdminUserId: string;
};

export type FieldErrors = Partial<Record<keyof FormState, string>>;

export type CreateAdminInvitationRequest = {
    condominiumId: number;
    name: string;
    cpf: string;
    phoneNumber: string;
    email: string;
};

export const emptyForm: FormState = {
    name: "",
    cnpj: "",
    cep: "",
    number: "",
    address: "",
    city: "",
    state: "",
    emailContact: "",
    status: ACTIVE_STATUS,
    adminName: "",
    adminCpf: "",
    adminPhoneNumber: "",
    adminEmail: "",
    linkedAdminUserId: "",
};

export function validateForm(form: FormState, mode: ModalMode): FieldErrors {
    const errors: FieldErrors = {};

    if (!form.name.trim()) {
        errors.name = "Informe o nome do condomínio.";
    } else if (form.name.trim().length < 3) {
        errors.name = "Use pelo menos 3 caracteres.";
    }

    if (mode === "create") {
        if (!form.cnpj.trim()) {
            errors.cnpj = "Informe o CNPJ.";
        } else if (!isValidCnpj(form.cnpj)) {
            errors.cnpj = "CNPJ inválido. Use um CNPJ real, com dígitos verificadores válidos.";
        }

        if (!form.cep.trim()) {
            errors.cep = "Informe o CEP.";
        } else if (!isValidCep(form.cep)) {
            errors.cep = "Informe um CEP válido com 8 dígitos.";
        }
    } else if (form.cep.trim() && !isValidCep(form.cep)) {
        errors.cep = "Informe um CEP válido com 8 dígitos.";
    }

    if (!form.emailContact.trim()) {
        errors.emailContact = "Informe o e-mail de contato.";
    } else if (!isValidEmail(form.emailContact)) {
        errors.emailContact = "Informe um e-mail válido.";
    }

    if (!form.number.trim()) {
        errors.number = "Informe o número.";
    }

    if (!form.address.trim()) {
        errors.address = "Informe o endereço.";
    } else if (form.address.trim().length < 3) {
        errors.address = "Use um endereço mais completo.";
    }

    if (!form.city.trim()) {
        errors.city = "Informe a cidade.";
    } else if (form.city.trim().length < 2) {
        errors.city = "Use pelo menos 2 caracteres.";
    }

    if (!form.state.trim()) {
        errors.state = "Selecione a UF.";
    } else if (!BRAZILIAN_STATES.includes(form.state.trim().toUpperCase())) {
        errors.state = "Selecione uma UF válida.";
    }

    if (mode === "create") {
        if (!form.adminName.trim()) {
            errors.adminName = "Informe o nome do administrador.";
        } else if (form.adminName.trim().length < 3) {
            errors.adminName = "Use pelo menos 3 caracteres.";
        }

        if (!form.adminCpf.trim()) {
            errors.adminCpf = "Informe o CPF do administrador.";
        } else if (!isValidCpf(form.adminCpf)) {
            errors.adminCpf = "CPF inválido. Use um CPF real, com dígitos verificadores válidos.";
        }

        const phoneDigits = onlyDigits(form.adminPhoneNumber);

        if (!phoneDigits) {
            errors.adminPhoneNumber = "Informe o telefone do administrador.";
        } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            errors.adminPhoneNumber = "Informe um telefone válido com DDD.";
        }

        if (!form.adminEmail.trim()) {
            errors.adminEmail = "Informe o e-mail do administrador.";
        } else if (!isValidEmail(form.adminEmail)) {
            errors.adminEmail = "Informe um e-mail válido.";
        }

    }

    return errors;
}

export function toCreateRequest(form: FormState): CreateCondominiumRequest {
    return {
        name: form.name.trim(),
        cnpj: onlyDigits(form.cnpj),
        cep: onlyDigits(form.cep),
        number: form.number.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        emailContact: form.emailContact.trim(),
    };
}

export function toOnboardingRequest(form: FormState): CreateCondominiumOnboardingRequest {
    return {
        condominium: toCreateRequest(form),
        admin: {
            name: form.adminName.trim(),
            cpf: onlyDigits(form.adminCpf),
            phoneNumber: onlyDigits(form.adminPhoneNumber),
            email: form.adminEmail.trim(),
        },
    };
}

export function toUpdateRequest(form: FormState): UpdateCondominiumRequest {
    return {
        name: form.name.trim(),
        cep: onlyDigits(form.cep),
        number: form.number.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        emailContact: form.emailContact.trim(),
        status: form.status,
    };
}

export function getStatusLabel(status: number) {
    return status === ACTIVE_STATUS ? "Ativo" : "Inativo";
}

export function getAccessStatusLabel(status: number) {
    return status === ACTIVE_STATUS ? "Ativo" : "Suspenso";
}

export function getCondominiumAdmins(condominiumId: number, admins: MasterUserResponse[]) {
    return admins
        .filter((admin) => admin.condominiumId === condominiumId)
        .sort((first, second) => {
            if (first.status !== second.status) {
                return first.status === ACTIVE_STATUS ? -1 : 1;
            }

            return first.personName.localeCompare(second.personName, "pt-BR");
        });
}

export function formatLocation(condominium: CondominiumResponse) {
    const cityState = [condominium.city, condominium.state]
        .filter(Boolean)
        .join(" - ");

    if (cityState && condominium.address) {
        return `${condominium.address}, ${condominium.number} · ${cityState}`;
    }

    return cityState || condominium.address || "Sem localização";
}

export function formatCnpj(value: string) {
    const digits = onlyDigits(value);

    if (digits.length !== 14) {
        return value || "não informado";
    }

    return digits.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5",
    );
}

export function formatCnpjInput(value: string) {
    const digits = onlyDigits(value).slice(0, 14);

    return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatCepInput(value: string) {
    const digits = onlyDigits(value).slice(0, 8);

    return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatCpfInput(value: string) {
    const digits = onlyDigits(value).slice(0, 11);

    return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatPhoneInput(value: string) {
    const digits = onlyDigits(value).slice(0, 11);

    if (digits.length <= 10) {
        return digits
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return digits
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
}

export function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
}

export function isValidCep(value: string) {
    return onlyDigits(value).length === 8;
}

export async function getAddressByCep(cep: string) {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) {
        return null;
    }

    const data = (await response.json()) as ViaCepResponse;

    if (data.erro) {
        return null;
    }

    return data;
}

export function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidCpf(value: string) {
    const cpf = onlyDigits(value);

    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
        return false;
    }

    const calculateDigit = (base: string, factor: number) => {
        const sum = base
            .split("")
            .reduce((total, digit) => total + Number(digit) * factor--, 0);
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    const firstDigit = calculateDigit(cpf.slice(0, 9), 10);
    const secondDigit = calculateDigit(cpf.slice(0, 10), 11);

    return cpf.endsWith(`${firstDigit}${secondDigit}`);
}

export function isValidCnpj(value: string) {
    const cnpj = onlyDigits(value);

    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
        return false;
    }

    const calculateDigit = (base: string, weights: number[]) => {
        const sum = base
            .split("")
            .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    const firstDigit = calculateDigit(cnpj.slice(0, 12), [
        5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
    ]);
    const secondDigit = calculateDigit(cnpj.slice(0, 13), [
        6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
    ]);

    return cnpj.endsWith(`${firstDigit}${secondDigit}`);
}

export function getFriendlyErrorMessage(message: string) {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("cnpj")) {
        return "Este CNPJ já está cadastrado ou não pôde ser aceito pela API.";
    }

    if (normalizedMessage.includes("cpf")) {
        return "Este CPF já está cadastrado ou não pôde ser aceito pela API.";
    }

    if (normalizedMessage.includes("email")) {
        return "Este e-mail já está cadastrado ou não pôde ser aceito pela API.";
    }

    if (normalizedMessage.includes("selected admin") || normalizedMessage.includes("admin user")) {
        return "Selecione um Admin válido vinculado aos condomínios criados por você.";
    }

    if (normalizedMessage.includes("created by themselves")) {
        return "Você só pode alterar admins de condomínios criados por você.";
    }

    return message || "Não foi possível salvar o condomínio.";
}

export function getUniqueAdmins(users: MasterUserResponse[]) {
    const adminsByUserId = new Map<number, MasterUserResponse>();

    for (const user of users) {
        if (!adminsByUserId.has(user.userId)) {
            adminsByUserId.set(user.userId, user);
        }
    }

    return Array.from(adminsByUserId.values()).sort((first, second) =>
        first.personName.localeCompare(second.personName, "pt-BR"),
    );
}
