// "Too many attempts" copy with the actual wait. The clock time is rounded up
// to the next whole minute so it is never earlier than the real unlock.
export function signInPausedMessage(retryAfterSeconds: number, now: Date = new Date()): string {
  const unlock = new Date(Math.ceil((now.getTime() + retryAfterSeconds * 1000) / 60000) * 60000);
  const minutes = Math.max(1, Math.round((unlock.getTime() - now.getTime()) / 60000));
  const clock = unlock.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s/g, "\u00A0");
  const wait = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `Too many sign-in attempts, so sign-in is paused. Try again in ${wait} (at ${clock}), or reset your password now.`;
}
