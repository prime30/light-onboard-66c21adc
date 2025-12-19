# Developer Handoff Documentation

## Overview

This is a multi-step registration/authentication flow for a wholesale beauty products platform (Drop Dead Gorgeous). The codebase features centralized state management, extracted hooks, responsive tablet/mobile design, and Lovable Cloud integration.

## Architecture

### Key Files & Structure

```
src/
├── pages/
│   ├── AuthPage.tsx          # Wrapper that provides RegistrationContext
│   ├── Auth.tsx              # Main auth component (~1950 lines)
│   ├── BlogResaleLicense.tsx # Blog page for resale license info
│   └── ResetPassword.tsx     # Password reset page
├── components/registration/
│   ├── context/
│   │   └── RegistrationContext.tsx  # Centralized state with useReducer
│   ├── steps/                # Individual step components
│   │   ├── index.ts          # Barrel exports
│   │   ├── AccountTypeForm.tsx
│   │   ├── ContactBasicsStep.tsx
│   │   ├── BusinessLocationStep.tsx
│   │   ├── BusinessOperationStep.tsx
│   │   ├── LicenseStep.tsx
│   │   ├── SchoolInfoStep.tsx
│   │   ├── TaxExemptionStep.tsx
│   │   ├── WholesaleTermsStep.tsx
│   │   ├── PreferencesStep.tsx
│   │   ├── SummaryForm.tsx
│   │   ├── SuccessForm.tsx
│   │   ├── OnboardingForm.tsx
│   │   ├── OnboardingStep.tsx
│   │   ├── LoginStep.tsx
│   │   └── SignInForm.tsx
│   ├── helpers/              # Shared UI components
│   │   ├── MarqueeBadges.tsx
│   │   ├── TestimonialCarousel.tsx
│   │   ├── AnimatedCounters.tsx
│   │   ├── CircularProgress.tsx
│   │   ├── MagneticFeatureBox.tsx
│   │   ├── PasswordInputField.tsx
│   │   └── index.ts
│   ├── AuthFooter.tsx        # Footer with back/next buttons and popover
│   ├── AuthModal.tsx         # Modal wrapper component
│   ├── AuthToggle.tsx        # Apply/Login toggle component
│   ├── FileUpload.tsx        # Single file upload component
│   ├── MultiFileUpload.tsx   # Multi-file upload component
│   ├── FileSummary.tsx       # Collapsible file list with thumbnails
│   ├── FilePreviewThumbnail.tsx # Image/file preview with lightbox
│   ├── StepIndicatorBar.tsx  # Step indicator with swipe gestures
│   ├── StepIndicator.tsx     # Base step indicator component
│   ├── StepValidationIcon.tsx # Validation state icons
│   └── FormSkeleton.tsx      # Loading skeleton for forms
├── hooks/
│   ├── use-auth.ts           # Auth state hook (useAuth)
│   ├── use-auth-form.ts      # React Hook Form integration
│   ├── use-auth-form-state.ts # All form useState extracted (~40 fields)
│   ├── use-form-validation.ts # Validation logic (canContinue, isAllStepsValid, etc.)
│   ├── use-form-persistence.ts  # sessionStorage persistence
│   ├── use-registration-sync.ts # Bridges local state to context
│   ├── use-registration-upload.ts # Document upload handling
│   ├── use-step-navigation.ts   # Step ordering & validation
│   ├── use-modal-swipe.ts    # Modal drag-to-dismiss gestures
│   ├── use-mode-switch.ts    # Sign-in/sign-up mode switching
│   ├── use-file-upload.ts    # File upload state management
│   ├── use-magnetic.tsx      # Magnetic hover effect
│   ├── use-click-ripple.tsx  # Click ripple animation
│   ├── use-font-loaded.tsx   # Font loading detection
│   └── use-countdown.tsx     # Countdown timer for resend codes
├── lib/
│   ├── auth-service.ts       # Supabase auth functions
│   ├── storage-service.ts    # File storage utilities
│   ├── imageCompression.ts   # Image compression before upload
│   ├── scroll-to-error.ts    # Scroll to validation errors
│   └── validations/
│       ├── auth-schemas.ts   # Zod validation schemas
│       └── form-utils.ts     # Form utility functions
├── data/
│   └── auth-constants.ts     # Constants (countries, states, etc.)
└── types/
    └── auth.ts               # TypeScript types
```

### Recent UI Improvements

| Feature | Description |
|---------|-------------|
| **Tablet Footer** | Full-width button with `rounded-full` on all mobile/tablet sizes |
| **Footer Gradient** | Smooth multi-stop gradient with blur effect behind footer |
| **Scroll Hint** | Responsive positioning (`z-50`) above footer on all screen sizes |
| **Hero Banner** | Increased border radius (`rounded-[20px]` mobile, `rounded-[24px]` tablet) |
| **File Thumbnails** | First uploaded image shows as thumbnail in collapsed accordion header |
| **Terms Link** | Uses `story-link` animation class with animated arrow icon on hover |

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
1. Onboarding (intro)
2. Account Type
3. Business Operation (commission/independent)
4. Contact Basics
5. License
6. Business Location
7. Tax Exemption
8. Wholesale Terms
9. Preferences
10. Summary

### Salon Owner
1. Onboarding (intro)
2. Account Type
3. Business Location
4. Contact Basics
5. License (with salon size/structure)
6. Tax Exemption
7. Wholesale Terms
8. Preferences
9. Summary

### Student
1. Onboarding (intro)
2. Account Type
3. School Info
4. Contact Basics
5. Tax Exemption
6. Wholesale Terms
7. Preferences
8. Summary

## What's Working

- ✅ Multi-step registration flow with 3 account types
- ✅ Form validation with Zod schemas
- ✅ Step navigation (next/back/jump to step)
- ✅ Form persistence to sessionStorage
- ✅ Supabase sign up / sign in
- ✅ Password reset flow
- ✅ Mobile-responsive design with tablet breakpoints
- ✅ Touch gestures (swipe navigation, modal drag-to-dismiss)
- ✅ File upload with image compression
- ✅ File preview thumbnails with lightbox zoom
- ✅ Upload progress indicator on submit button
- ✅ Extracted hooks for form state and validation
- ✅ Modular footer and step indicator components
- ✅ Smooth footer gradient transition on scroll
- ✅ Font loading detection with skeleton states

## What Needs Work

### High Priority
1. **No profiles table** - User metadata is stored in auth.users only
2. **No file upload to Supabase Storage** - License/enrollment files aren't persisted
3. **No E2E tests** - Need Playwright or Cypress tests

### Medium Priority
1. **Complete context migration** - Step components should consume directly from context
2. **Add loading states** - Per-step loading indicators during API calls
3. **Error boundaries** - Add React error boundaries
4. **Accessibility audit** - Screen reader support, focus management

### Nice to Have
1. **Unit tests** - Vitest tests for hooks and utilities
2. **Storybook** - Component documentation
3. **Rate limiting** - Client-side debouncing on submissions

## Component Reference

### AuthFooter

Self-contained footer with:
- Back/Next buttons with animated transitions
- Popover showing incomplete steps on summary
- Upload progress bar overlay during document upload
- Shimmer animation trigger for CTA
- Responsive border radius (`rounded-full` mobile/tablet, none on desktop)

Props:
```typescript
interface AuthFooterProps {
  mode: AuthMode;
  currentStep: Step;
  canContinue: boolean;
  isAllStepsValid: boolean;
  isSubmitting: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  footerTransitionsEnabled: boolean;
  footerEnterReady: boolean;
  incompleteSteps: IncompleteStep[];
  shimmerKey?: number;
  onBack: () => void;
  onNext: () => void;
  onGoToStep: (step: number, missingFields?: string[]) => void;
}
```

### FileSummary

Collapsible accordion showing uploaded documents:
- First image file displays as thumbnail in header (not generic icon)
- Expandable list with file previews
- Lightbox zoom on image click
- File size display

### FilePreviewThumbnail

Individual file preview component:
- Image thumbnails with object-cover
- PDF icon for PDF files
- Generic file icon for other types
- Dialog-based lightbox for full-size view
- Optional remove button

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
} = useFormValidation({ /* form fields */ });
```

### useModalSwipe

Handles modal drag-to-dismiss gestures:

```typescript
const {
  isDragging,
  dragOffset,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  resetDrag,
} = useModalSwipe({
  onClose: handleCloseModal,
  threshold: 150,
});
```

### useModeSwitch

Handles mode switching between sign-in and sign-up with preserved state:

```typescript
const { handleModeChange } = useModeSwitch({
  currentState: { mode, currentStep, accountType, /* ... */ },
  setters: { setMode, setCurrentStep, /* ... */ },
  mainScrollRef,
});
```

## Design System

### Key CSS Variables (index.css)

The app uses semantic tokens for theming:
- `--background` / `--foreground` - Main background and text colors
- `--muted` / `--muted-foreground` - Subdued surfaces and text
- `--primary` / `--primary-foreground` - Brand color
- `--destructive` - Error states
- `--border` - Border colors
- `--radius` - Border radius tokens

### Custom Classes

- `rounded-form` - Standard form element border radius
- `h-button` - Standard button height
- `story-link` - Animated underline link effect
- `btn-premium` - Premium button styling with shimmer
- `animate-stagger-*` - Staggered entrance animations
- `animate-scroll-wheel` - Scroll hint animation

### Responsive Breakpoints

- Mobile: default
- `sm:` - 640px+
- `md:` - 768px+ (tablet)
- `lg:` - 1024px+ (desktop)

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
VITE_SUPABASE_URL=<auto-configured by Lovable Cloud>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configured>
VITE_SUPABASE_PROJECT_ID=<auto-configured>
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

## Next Steps for Backend Integration

### To add file uploads to Supabase Storage:

```sql
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- RLS policies for authenticated users
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

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
  suite_number TEXT,
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
  birthday_month TEXT,
  birthday_day TEXT,
  social_media_handle TEXT,
  subscribe_order_updates BOOLEAN DEFAULT true,
  subscribe_promotions BOOLEAN DEFAULT false,
  license_document_path TEXT,
  tax_exempt_document_path TEXT,
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

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

## Known Issues

1. **Footer gradient hard line** - The gradient behind the mobile/tablet footer may show a visible edge on certain screen sizes. Current implementation uses blur effect and multi-stop gradient to minimize this.

2. **Font loading flash** - Custom fonts (Termina, Aeonik Pro) may cause layout shift on initial load. Skeleton states are used to mitigate.

## Contact

For questions about the codebase, refer to the original Lovable project or reach out to the team.
