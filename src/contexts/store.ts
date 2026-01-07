import { atom } from "jotai";

export type Customer = {
  isLoggedIn: boolean;
};

export const customerAtom = atom<Customer>();
