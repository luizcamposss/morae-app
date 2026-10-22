// Who filled in the landing form: 1 administrador(a) de condomínios, 2 síndico(a).
export type LandingContactProfile = 1 | 2;

// Sales follow-up moved by the Master: 1 Novo, 2 Em conversa, 3 Fechado, 4 Sem interesse.
export type LandingContactStatus = 1 | 2 | 3 | 4;

export type LandingContactResponse = {
  id: number;
  name: string;
  // Digits only, with the country code ("5511999990000").
  whatsApp: string;
  unitCount: number;
  profile: LandingContactProfile;
  pain?: string | null;
  painLabel?: string | null;
  status: LandingContactStatus;
  // Ready https://wa.me link with the first message.
  whatsAppUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateLandingContactStatusRequest = {
  status: LandingContactStatus;
};
