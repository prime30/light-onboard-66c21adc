/**
 * Client wrapper for the customer-gate edge function.
 *
 * Server-side does the actual Shopify Admin API call (token never reaches
 * the browser). This module just normalizes the response and enforces a
 * fail-open posture on any client-side error so a network blip can't lock
 * out a legitimate user mid-SSO.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CustomerGateResult {
  eligible: boolean;
  numberOfOrders: number;
  found: boolean;
  degraded?: boolean;
}

const FAIL_OPEN: CustomerGateResult = {
  eligible: true,
  numberOfOrders: 0,
  found: false,
  degraded: true,
};

export async function checkCustomerGate(email: string): Promise<CustomerGateResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return FAIL_OPEN;

  try {
    const { data, error } = await supabase.functions.invoke<CustomerGateResult>(
      "customer-gate",
      { body: { email: trimmed } }
    );
    if (error || !data) {
      console.warn("[customer-gate] invoke failed, failing open:", error);
      return FAIL_OPEN;
    }
    return data;
  } catch (err) {
    console.warn("[customer-gate] threw, failing open:", err);
    return FAIL_OPEN;
  }
}
