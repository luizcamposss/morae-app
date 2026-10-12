// Public link the invited person opens to create their password.
export function getInvitationLink(token: string) {
  return `${window.location.origin}/accept-invitation/${token}`;
}
