// Commercial WhatsApp of the landing. Without a number the link opens WhatsApp's own contact picker.
const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const GREETING_LINK = whatsappLink("Oi! Quero conhecer o Moraê.");
