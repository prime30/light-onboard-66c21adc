// Main form context (combines both form data and step contexts)
export { FormProvider, useForm } from "./FormContext";

// Individual contexts for more granular control
export { FormDataProvider, useFormData, defaultValues, dirtyFieldOptions } from "./FormDataContext";
export { StepProvider, useStepContext } from "./StepContext";

// Types
export type { AuthFormContextType } from "./FormContext";
export type {
  FormDataContextType,
  ValidFieldNames,
  ValidationStatus,
  FormFieldProps,
} from "./FormDataContext";
export type { StepContextType } from "./StepContext";
