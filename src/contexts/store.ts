import { atom } from "jotai";

export type Customer = {
  isLoggedIn: boolean;
  /** Storefront API access token (standalone mode only). */
  accessToken?: string | null;
  /** ISO timestamp at which the access token expires. */
  expiresAt?: string | null;
  /** Email of the signed-in customer, if known. */
  email?: string | null;
  /** First name of the signed-in customer, if known. */
  firstName?: string | null;
};

export const customerAtom = atom<Customer>({
  isLoggedIn: false,
  accessToken: null,
  expiresAt: null,
  email: null,
  firstName: null,
});
