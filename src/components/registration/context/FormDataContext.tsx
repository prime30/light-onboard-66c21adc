import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  AllRegistrationFormData,
  defaultValues,
  RegistrationFormData,
  registrationSchema,
  ValidFieldNames,
} from "@/lib/validations/auth-schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Control, FormState, useForm, UseFormRegister } from "react-hook-form";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useAtom } from "jotai/react";
import z from "zod";
import { useApiClient } from "@/hooks/use-api-client";
import { readHoneypotValue, readFormStartedAt } from "@/components/registration/HoneypotField";
import { customerAtom } from "@/contexts/store";
import { saveStoredSession } from "@/lib/standalone-session";
import { useGlobalApp } from "@/contexts";
import { IframeMessageTypes } from "@/hooks/use-iframe-comm";

export type ValidationStatus = "complete" | "in-progress" | "error";

export type FormDataContextType = {
  register: UseFormRegister<RegistrationFormData>;
  control: Control<RegistrationFormData>;
  watch: ReturnType<typeof useForm<RegistrationFormData>>["watch"];
  reset: ReturnType<typeof useForm<RegistrationFormData>>["reset"];
  setError: ReturnType<typeof useForm<RegistrationFormData>>["setError"];
  setFocus: ReturnType<typeof useForm<RegistrationFormData>>["setFocus"];
  submitForm: (e?: React.BaseSyntheticEvent) => Promise<void>;
  setValue: ReturnType<typeof useForm<RegistrationFormData>>["setValue"];
  formState: ReturnType<typeof useForm<RegistrationFormData>>["formState"];
  subscribe: ReturnType<typeof useForm<RegistrationFormData>>["subscribe"];
  getValidationStatus: (fields: ValidFieldNames | ValidFieldNames[]) => ValidationStatus;
  errors: ReturnType<typeof useForm<AllRegistrationFormData>>["formState"]["errors"];
  dirtyFields: ReturnType<typeof useForm<RegistrationFormData>>["formState"]["dirtyFields"];
  isFormValid: boolean;
  fullErrors: ReturnType<typeof z.treeifyError<RegistrationFormData>>;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  isSubmitting: boolean;
  errorActions: Array<{ type: string; label: string; url?: string }>;
  discountCode: string | null;
  discountExpiry: string | null;
};

type FormStateWithValues = Partial<FormState<RegistrationFormData>> & {
  values: Partial<RegistrationFormData>;
};

export const dirtyFieldOptions = {
  shouldDirty: true,
  shouldTouch: true,
  shouldValidate: true,
};

// Create the context
const FormDataContext = createContext<FormDataContextType | null>(null);

// Storage
const storage = createJSONStorage(() => sessionStorage);
// Bumped key to "_registration_form_v2" to invalidate any cached sessionStorage
// from older builds that pre-selected accountType: "professional" by default.
const formAtom = atomWithStorage("_registration_form_v2", defaultValues, storage, {
  getOnInit: true,
});

type FormDataProviderProps = {
  children: ReactNode;
  initialValues?: Partial<RegistrationFormData>;
};

// Provider component
export function FormDataProvider({
  children,
  initialValues = defaultValues,
}: FormDataProviderProps) {
  const [storedForm, setStoredForm] = useAtom(formAtom);
  const { apiCall } = useApiClient();
  const { isInIframe, sendMessage } = useGlobalApp();
  const [, setCustomer] = useAtom(customerAtom);
  const [errorActions, setErrorActions] = useState<
    Array<{ type: string; label: string; url?: string }>
  >([]);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [discountExpiry, setDiscountExpiry] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset: hookFormReset,
    setValue,
    watch,
    formState,
    subscribe,
    control,
    setError,
    setFocus,
    clearErrors,
  } = useForm<RegistrationFormData>({
    mode: "onChange",
    resolver: zodResolver(registrationSchema),
    defaultValues,
  });

  const { errors, dirtyFields, isSubmitted, isSubmitSuccessful, isSubmitting } = formState;

  const submitForm = handleSubmit(
    async (values) => {
      console.log("submit values:", values);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer`;
      const result = await apiCall(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "CREATE_CUSTOMER",
            data: values,
            honeypot: readHoneypotValue(),
            formStartedAt: readFormStartedAt(),
          }),
        },
        "Account created successfully!"
      );

      if (result.success === false) {
        console.log("set error");
        setErrorActions(result.actions || []);
        setError("root.form", {
          type: "server",
          message: result.error,
        });
        throw new Error(result.error);
      }

      // Auto-login: hand the parent Shopify theme the credentials so the
      // user lands logged-in on the storefront. In iframe mode we fire
      // USER_LOGIN IMMEDIATELY on success — the parent theme reloads in
      // the background while our success screen + scrim stay mounted on
      // top. When the user clicks "Done", CLOSE_IFRAME reveals an
      // already-logged-in storefront with no flash. CLOSE_IFRAME stays
      // deferred to the button click. In standalone mode we exchange
      // directly via the Storefront API. Failures do NOT block success.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const password = (values as any).password as string | undefined;
      if (password && values.email) {
        if (isInIframe) {
          sendMessage(IframeMessageTypes.USER_LOGIN, {
            email: values.email,
            password,
          });
        } else {
          (async () => {
            try {
              const loginResult = await apiCall<{
                accessToken: string;
                expiresAt: string;
              }>(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: values.email, password }),
              });
              if (loginResult.success && loginResult.data?.accessToken) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fname = ((values as any).firstName as string | undefined) ?? null;
                saveStoredSession({
                  accessToken: loginResult.data.accessToken,
                  expiresAt: loginResult.data.expiresAt,
                  email: values.email,
                  firstName: fname,
                });
                setCustomer({
                  isLoggedIn: true,
                  accessToken: loginResult.data.accessToken,
                  expiresAt: loginResult.data.expiresAt,
                  email: values.email,
                  firstName: fname,
                });
              }
            } catch (err) {
              console.warn("customer-login failed (non-blocking):", err);
            }
          })();
        }
      }

      // Fire-and-forget: generate discount code after successful registration.
      // Failures here do not block the success screen.
      (async () => {
        try {
          const discountUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-discount`;
          const discountResponse = await fetch(discountUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Send email so the edge function can write the welcome offer to
            // the customer's Shopify metafields (powers the cross-device
            // announcement bar marquee on the storefront).
            body: JSON.stringify({ email: values.email }),
          });
          if (discountResponse.ok) {
            const discountResult = await discountResponse.json();
            if (discountResult.success && discountResult.code) {
              setDiscountCode(discountResult.code);
              setDiscountExpiry(discountResult.endsAt ?? null);

              // Notify the parent Shopify theme (when embedded as an iframe)
              // that a fresh welcome offer is available. The theme's
              // announcement bar listens for this and saves it to localStorage
              // so the marquee slide appears immediately on subsequent pages.
              try {
                window.parent?.postMessage(
                  {
                    type: "dd:welcome_offer",
                    code: discountResult.code,
                    endsAt: discountResult.endsAt ?? null,
                  },
                  "*"
                );
              } catch (postErr) {
                console.warn("welcome_offer postMessage failed:", postErr);
              }
            }
          } else {
            console.warn("generate-discount non-OK response:", discountResponse.status);
          }
        } catch (err) {
          console.warn("generate-discount error (non-blocking):", err);
        }
      })();

      return result.data;
    },
    (errors) => {
      console.log("errors: ", errors);
      setError("root.form", {
        type: "validation",
        message: "Please fix the field errors and try again.",
      });
    }
  );

  const getValidationStatus = useCallback(
    (fields: ValidFieldNames | ValidFieldNames[]): ValidationStatus => {
      if (!Array.isArray(fields)) {
        fields = [fields];
      }

      const hasErrors = fields.some((field) => errors[field as ValidFieldNames]);
      if (hasErrors) {
        return "error";
      }

      const allDirty = fields.every((field) => dirtyFields[field as ValidFieldNames]);
      if (allDirty) {
        return "complete";
      }

      return "in-progress";
    },
    [errors, dirtyFields]
  );

  const fields = watch();
  const { isFormValid, fullErrors } = useMemo(() => {
    const currentData = fields;
    const result = registrationSchema.safeParse(currentData);
    const fullErrors: ReturnType<typeof z.treeifyError<RegistrationFormData>> = result.success
      ? { errors: [], properties: {} }
      : z.treeifyError(result.error);
    return {
      isFormValid: result.success,
      fullErrors,
    };
  }, [fields]);

  // On mount, populate form with stored values and initial values
  useEffect(() => {
    if (storedForm) {
      Object.entries(storedForm).forEach(([key, value]) => {
        setValue(key as ValidFieldNames, value, dirtyFieldOptions);
      });
    }
    if (initialValues) {
      Object.entries(initialValues).forEach(([key, value]) => {
        setValue(key as ValidFieldNames, value, dirtyFieldOptions);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStoredFormValues = useCallback(
    ({ values }: FormStateWithValues) => {
      type ValueType = (typeof values)[keyof typeof values];
      const newStore = Object.entries(values).reduce((acc, [key, value]: [string, ValueType]) => {
        // SECURITY: never persist password / confirmPassword to sessionStorage.
        // We collect them on the create-password step but only keep them in
        // react-hook-form memory until submit, then they're cleared.
        if (key === "password" || key === "confirmPassword") {
          return acc;
        }
        if (
          (Array.isArray(value) && value.length === 0) ||
          (Array.isArray(value) && typeof value[0] === "object" && value[0].file instanceof File)
        ) {
          return acc;
        }

        if (value !== undefined && value !== "") {
          acc[key] = value;
        }

        return acc;
      }, {} as Partial<RegistrationFormData>);
      setStoredForm(newStore);
    },
    [setStoredForm]
  );

  const clearFormErrors = useCallback(
    ({ errors }: FormStateWithValues) => {
      // Clear form errors when any field changes
      if (errors?.root?.form && !isSubmitting) {
        clearErrors("root.form");
        setErrorActions([]);
      }
    },
    [clearErrors, isSubmitting]
  );

  useEffect(() => {
    const callback = subscribe({
      formState: {
        values: true,
      },
      callback: (formState) => {
        setStoredFormValues(formState);
        clearFormErrors(formState);
      },
    });

    return () => callback();
  }, [subscribe, setStoredForm, setStoredFormValues, clearFormErrors]);

  const reset = useCallback(
    (values: Partial<RegistrationFormData> = {}) => {
      const resetValues = { ...defaultValues, ...values };
      hookFormReset(resetValues);
      setStoredFormValues({ values: resetValues });
    },
    [hookFormReset, setStoredFormValues]
  );

  const value: FormDataContextType = {
    register,
    control,
    watch,
    reset,
    setError,
    setFocus,
    submitForm,
    setValue,
    formState,
    subscribe,
    getValidationStatus,
    errors,
    dirtyFields,
    isFormValid,
    fullErrors,
    isSubmitted,
    isSubmitSuccessful,
    isSubmitting,
    errorActions,
    discountCode,
    discountExpiry,
  };

  return <FormDataContext.Provider value={value}>{children}</FormDataContext.Provider>;
}

// Hook to consume the context
export function useFormData(): FormDataContextType {
  const context = useContext(FormDataContext);

  if (!context) {
    throw new Error("useFormData must be used within a FormDataProvider");
  }

  return context;
}
