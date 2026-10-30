namespace backend.Enums;

// Who filled in the landing page contact form.
public enum LandingContactProfileType
{
    Undefined = 0,
    Administrator = 1, // Administrador / administradora de condomínios
    Syndic = 2         // Síndico
}

// Sales follow-up of a landing page contact, moved by the Master.
public enum LandingContactStatus
{
    Undefined = 0,
    New = 1,            // Novo
    InConversation = 2, // Em conversa
    Closed = 3,         // Fechado
    NotInterested = 4   // Sem interesse
}
