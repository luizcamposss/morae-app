import { useSyncExternalStore } from "react";
import { apiRequest } from "../lib/api/apiClient";

type CommercialContactResponse = { whatsAppNumber: string | null };

// Commercial WhatsApp (landing and login), set on the server in Commercial__WhatsAppNumber.
// One request per page load, shared by every caller; null while loading, when not configured or on error.
let whatsAppNumber: string | null = null;
let request: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

// Loads the number once; after a failure the next call tries again.
export function loadCommercialWhatsApp(): Promise<string | null> {
  if (!request) {
    request = apiRequest<CommercialContactResponse>("/api/public/commercial-contact")
      .then((body) => body.whatsAppNumber?.replace(/\D/g, "") || null)
      .catch(() => {
        request = null;
        return null;
      })
      .then((number) => {
        whatsAppNumber = number;
        listeners.forEach((listener) => listener());
        return number;
      });
  }

  return request;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadCommercialWhatsApp();
  return () => listeners.delete(listener);
}

// The page renders right away; the WhatsApp buttons show up only once a number arrives.
export function useCommercialWhatsApp() {
  return useSyncExternalStore(
    subscribe,
    () => whatsAppNumber,
    () => null,
  );
}

export function whatsappLink(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
