# Developer Handoff Documentation

## Overview

This is a multi-step registration/authentication flow for a wholesale beauty products platform. The codebase has been significantly refactored for maintainability with centralized state management, extracted hooks, and proper Supabase integration.

## Architecture

### Key Files & Structure

```
src/
├── pages/
│   ├── AuthPage.tsx          # Wrapper that provides RegistrationContext
│   └── Auth.tsx              # Main auth component (~2000 lines, down from ~2900)
├── components/registration/
│   ├── context/
│   │   └── RegistrationContext.tsx  # Centralized state with useReducer
│   ├── steps/                # Individual step components
│   │   ├── index.ts          # Barrel exports
│   │   ├── AccountTypeForm.tsx
│   │   ├── ContactBasicsStep.tsx
│   │   ├── BusinessLocationStep.tsx
│   │   ├── LicenseStep.tsx
│   │   └── ... (more steps)
│   ├── helpers/              # Shared UI components
│   │   ├── MarqueeBadges.tsx
│   │   └── index.ts
│   ├── AuthFooter.tsx        # Footer with back/next buttons and popover
│   ├── StepIndicatorBar.tsx  # Step indicator with swipe gestures
│   └── StepIndicator.tsx     # Base step indicator component
├── hooks/
│   ├── use-auth.ts           # Auth state hook (useAuth)
│   ├── use-auth-form.ts      # React Hook Form integration
│   ├── use-auth-form-state.ts # All form useState extracted (~40 fields)
│   ├── use-form-validation.ts # Validation logic (canContinue, isAllStepsValid, etc.)
│   ├── use-form-persistence.ts  # sessionStorage persistence
│   ├── use-registration-sync.ts # Bridges local state to context
│   └── use-step-navigation.ts   # Step ordering & validation
├── lib/
│   ├── auth-service.ts       # Supabase auth functions
│   └── validations/
│       └── auth-schemas.ts   # Zod validation schemas
└── types/
    └── auth.ts               # TypeScript types
```

### Refactoring Completed

The following extractions have been completed to reduce Auth.tsx size:

| Extraction | Lines Saved | New Location |
|------------|-------------|--------------|
| Form useState calls | ~300 lines | `use-auth-form-state.ts` |
| Footer JSX + logic | ~130 lines | `AuthFooter.tsx` |
| Step indicator JSX | ~160 lines | `StepIndicatorBar.tsx` |
| Validation functions | ~290 lines | `use-form-validation.ts` |
| Progress calculation | ~85 lines | `use-form-validation.ts` |
| **Total** | **~965 lines** | |

### State Management

The app uses a hybrid approach:

1. **RegistrationContext** (`useReducer`) - Centralized state container
2. **useAuthFormState** - Extracts all form state with sessionStorage persistence
3. **useFormValidation** - Contains validation logic, progress calculation
4. Step components receive props from Auth.tsx but can also consume from context

### Authentication

Supabase auth is wired up with:

- `src/lib/auth-service.ts` - Core auth functions (signUp, signIn, signOut, resetPassword)
- `src/hooks/use-auth.ts` - React hook for auth state
- Auto-confirm email is enabled for development

## Registration Flows

Three account types with different step sequences:

### Professional (Stylist)
1. Account Type
2. Business Operation (commission/independent)
3. Contact Basics
4. Business Location
5. License
6. Tax Exemption
7. Wholesale Terms
8. Preferences
9. Summary

### Salon Owner
1. Account Type
2. Business Location
3. Contact Basics
4. License (with salon size/structure)
5. Tax Exemption
6. Wholesale Terms
7. Preferences
8. Summary

### Student
1. Account Type
2. School Info
3. Contact Basics
4. Tax Exemption
5. Wholesale Terms
6. Preferences
7. Summary

## What's Working

- ✅ Multi-step registration flow
- ✅ Form validation with Zod schemas
- ✅ Step navigation (next/back/jump)
- ✅ Form persistence to sessionStorage
- ✅ Supabase sign up / sign in
- ✅ Password reset flow
- ✅ Mobile-responsive design
- ✅ Touch gestures (swipe navigation)
- ✅ Extracted hooks for form state and validation
- ✅ Modular footer and step indicator components

## What Needs Work

### High Priority
1. **No profiles table** - User metadata is stored in auth.users only
2. **No file upload to storage** - License/enrollment files aren't uploaded to Supabase Storage
3. **No E2E tests** - Need Playwright or Cypress tests

### Medium Priority
1. **Complete context migration** - Step components should consume directly from context
2. **Add loading states** - Per-step loading indicators
3. **Error boundaries** - Add React error boundaries
4. **Accessibility audit** - Screen reader support, focus management

### Nice to Have
1. **Unit tests** - Vitest tests for hooks and utilities
2. **Storybook** - Component documentation
3. **Rate limiting** - Client-side debouncing on submissions

## Extracted Hooks Reference

### useAuthFormState

Contains all form state with sessionStorage persistence:

```typescript
const {
  mode, setMode,
  currentStep, setCurrentStep,
  accountType, setAccountType,
  firstName, setFirstName,
  // ... ~40 more fields
  resetForm,
  hasFormProgress,
} = useAuthFormState();
```

### useFormValidation

Contains all validation and progress logic:

```typescript
const {
  canContinue,        // () => boolean - Can current step continue?
  isAllStepsValid,    // () => boolean - All required fields complete?
  getIncompleteSteps, // () => IncompleteStep[] - List of incomplete steps
  isFormReadyToSubmit,// boolean - On summary with all valid?
  getFormProgress,    // () => number - Progress percentage (0-100)
} = useFormValidation({
  mode, currentStep, accountType,
  firstName, lastName, email, password, phoneNumber,
  businessName, businessAddress, country, city, state, zipCode,
  licenseNumber, salonSize, salonStructure,
  schoolName, schoolState, enrollmentProofFiles,
  businessOperationType, hasTaxExemption, taxExemptFile, wholesaleAgreed,
});
```

### Extracted Components

**AuthFooter** - Self-contained footer with:
- Back/Next buttons with animated transitions
- Popover showing incomplete steps on summary
- Shimmer animation trigger for CTA

**StepIndicatorBar** - Self-contained step indicator with:
- Swipe gesture handlers for step navigation
- Visual step progress with animations
- Intro/success step icons

## Key Dependencies

- React 18 + Vite
- TailwindCSS + shadcn/ui
- react-hook-form + zod
- @supabase/supabase-js
- react-router-dom v6
- sonner (toasts)
- lucide-react (icons)

## Environment Variables

```env
VITE_SUPABASE_URL=<auto-configured>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configured>
```

## Running Locally

The project is designed to run on Lovable. For local development:

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase environment variables
4. Run: `npm run dev`

## Testing Auth

With auto-confirm email enabled:
1. Sign up with any email
2. Account is immediately active
3. Sign in with the same credentials

## Notes for Continuing Refactoring

### Remaining Work in Auth.tsx

The following can still be extracted:

1. **Modal/swipe logic** - `handleModalTouchStart`, `handleModalTouchMove`, `handleModalTouchEnd` (~60 lines)
2. **Mode switching logic** - `handleModeChange`, preserved state refs (~80 lines)
3. **Step content rendering** - The main switch/case for step components (~200 lines)

### To add file uploads:
1. Create Supabase storage bucket for documents
2. Add RLS policies for authenticated users
3. Create upload utility in `src/lib/storage.ts`
4. Update file upload components to use storage

### To add profiles table:
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  account_type TEXT,
  first_name TEXT,
  last_name TEXT,
  preferred_name TEXT,
  phone_number TEXT,
  phone_country_code TEXT,
  business_name TEXT,
  business_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  license_number TEXT,
  salon_size TEXT,
  salon_structure TEXT,
  school_name TEXT,
  school_state TEXT,
  business_operation_type TEXT,
  has_tax_exemption BOOLEAN,
  wholesale_agreed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Contact

For questions about the codebase, refer to the original Lovable project or reach out to the team.
