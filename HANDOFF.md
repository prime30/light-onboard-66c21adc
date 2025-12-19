# Developer Handoff Documentation

## Overview

This is a multi-step registration/authentication flow for a wholesale beauty products platform. The codebase has been refactored for maintainability with centralized state management, extracted hooks, and proper Supabase integration.

## Architecture

### Key Files & Structure

```
src/
├── pages/
│   ├── AuthPage.tsx          # Wrapper that provides RegistrationContext
│   └── Auth.tsx              # Main auth component (still large, ~2900 lines)
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
│   ├── AuthFooter.tsx        # Footer with back/next buttons
│   └── StepIndicatorBar.tsx  # Step indicator with swipe
├── hooks/
│   ├── use-auth.ts           # Auth state hook (useAuth)
│   ├── use-auth-form.ts      # React Hook Form integration
│   ├── use-auth-form-state.ts # All form useState extracted (~40 fields)
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

### State Management

The app uses a hybrid approach during the refactoring transition:

1. **RegistrationContext** (`useReducer`) - Centralized state container
2. **useRegistrationSync** - Bridges Auth.tsx's `useState` calls to context
3. Step components receive props from Auth.tsx but can also consume from context

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

## What Needs Work

### High Priority
1. **Auth.tsx is still large** (~2900 lines) - Continue extracting logic to hooks
2. **No profiles table** - User metadata is stored in auth.users only
3. **No file upload to storage** - License/enrollment files aren't uploaded to Supabase Storage
4. **No E2E tests** - Need Playwright or Cypress tests

### Medium Priority
1. **Complete context migration** - Step components should consume directly from context
2. **Add loading states** - Per-step loading indicators
3. **Error boundaries** - Add React error boundaries
4. **Accessibility audit** - Screen reader support, focus management

### Nice to Have
1. **Unit tests** - Vitest tests for hooks and utilities
2. **Storybook** - Component documentation
3. **Rate limiting** - Client-side debouncing on submissions

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

### Extracted Hooks & Components (Ready to Use)

- **`useAuthFormState`** - Contains all ~40 useState calls, sessionStorage persistence, and form actions
- **`AuthFooter`** - Footer component with back/next buttons and incomplete steps popover
- **`StepIndicatorBar`** - Step indicator with swipe gesture handlers
- **`useStepNavigation`** - Step ordering, validation, and navigation utilities

### To fully migrate Auth.tsx:
1. Replace inline useState calls with `useAuthFormState()` hook
2. Replace footer JSX with `<AuthFooter />` component
3. Replace step indicator JSX with `<StepIndicatorBar />` component
4. Update step components to use `useRegistration()` directly
5. Extract modal/swipe logic to a custom hook

### To add file uploads:
1. Create Supabase storage bucket for documents
2. Add RLS policies for authenticated users
3. Create upload utility in `src/lib/storage.ts`
4. Update file upload components to use storage

### To add profiles table:
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  account_type TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

## Contact

For questions about the codebase, refer to the original Lovable project or reach out to the team.
