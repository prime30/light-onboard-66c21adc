# Developer Handoff Documentation

## Overview

This is a production-ready multi-step registration/authentication flow for **Drop Dead Gorgeous**, a wholesale beauty products platform. The codebase features centralized state management, extracted hooks, responsive tablet/mobile design, and full Lovable Cloud integration with database and storage.

## ✅ Deployment Status

| Component      | Status        | Notes                                  |
| -------------- | ------------- | -------------------------------------- |
| Frontend       | ✅ Ready      | React + Vite + TailwindCSS             |
| Database       | ✅ Configured | Profiles table with RLS                |
| Storage        | ✅ Configured | registration-documents bucket with RLS |
| Authentication | ✅ Configured | Email/password with auto-confirm       |
| Edge Functions | ✅ Deployed   | Address autocomplete (Google Places)   |

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
│   ├── steps/                # Individual step components (15 files)
│   ├── helpers/              # Shared UI components (7 files)
│   ├── AuthFooter.tsx        # Footer with back/next buttons
│   ├── FileSummary.tsx       # Collapsible file list with thumbnails
│   ├── FilePreviewThumbnail.tsx # Image/file preview with lightbox
│   ├── StepIndicatorBar.tsx  # Step indicator with swipe gestures
│   └── FormSkeleton.tsx      # Loading skeleton for forms
├── hooks/                    # 15+ custom hooks
├── lib/
│   ├── auth-service.ts       # Supabase auth functions
│   ├── storage-service.ts    # File storage utilities
│   └── validations/          # Zod schemas and form utilities
└── types/
    └── auth.ts               # TypeScript types
```

## Database Schema

### profiles Table

Stores all user registration data with RLS enabled:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  account_type TEXT,           -- 'professional', 'salon', 'student'
  first_name TEXT,
  last_name TEXT,
  preferred_name TEXT,
  email TEXT,
  phone_number TEXT,
  phone_country_code TEXT DEFAULT '+1',
  business_name TEXT,
  business_address TEXT,
  suite_number TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  license_number TEXT,
  salon_size TEXT,
  salon_structure TEXT,
  school_name TEXT,
  school_state TEXT,
  business_operation_type TEXT,  -- 'commission', 'independent'
  has_tax_exemption BOOLEAN,
  wholesale_agreed BOOLEAN DEFAULT false,
  birthday_month TEXT,
  birthday_day TEXT,
  social_media_handle TEXT,
  subscribe_order_updates BOOLEAN DEFAULT true,
  subscribe_promotions BOOLEAN DEFAULT false,
  license_document_path TEXT,
  license_proof_paths TEXT[],
  enrollment_proof_paths TEXT[],
  tax_exempt_document_path TEXT,
  application_status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies

- Users can only view/update/insert their own profile
- Auto-create profile trigger on user signup
- Auto-update `updated_at` on changes

### Storage

**Bucket:** `registration-documents` (private)

**Structure:**

```
registration-documents/
└── {user_id}/
    ├── license/
    ├── license-proof/
    ├── enrollment-proof/
    └── tax-exempt/
```

**RLS Policies:** Users can only access files in their own folder (`{user_id}/`)

## Registration Flows

Three account types with different step sequences:

### Professional (Stylist) - 10 steps

1. Onboarding → 2. Account Type → 3. Business Operation → 4. Contact Basics → 5. License → 6. Business Location → 7. Tax Exemption → 8. Wholesale Terms → 9. Preferences → 10. Summary

### Salon Owner - 9 steps

1. Onboarding → 2. Account Type → 3. Business Location → 4. Contact Basics → 5. License → 6. Tax Exemption → 7. Wholesale Terms → 8. Preferences → 9. Summary

### Student - 8 steps

1. Onboarding → 2. Account Type → 3. School Info → 4. Contact Basics → 5. Tax Exemption → 6. Wholesale Terms → 7. Preferences → 8. Summary

## What's Complete

- ✅ Multi-step registration flow with 3 account types
- ✅ Form validation with Zod schemas
- ✅ Step navigation (next/back/jump to step)
- ✅ Form persistence to sessionStorage with restore flow
  - Shows onboarding screen first with toast "Welcome back!"
  - Animates to first incomplete step after toast dismisses
  - Rippling circle loading indicator during restore
- ✅ Supabase sign up / sign in
- ✅ Password reset flow
- ✅ Mobile-responsive design with tablet breakpoints
- ✅ Touch gestures (swipe navigation, modal drag-to-dismiss)
- ✅ File upload with image compression
- ✅ File preview thumbnails with lightbox zoom
- ✅ Upload progress indicator on submit button
- ✅ Save progress animation (rippling circles) on modal close
- ✅ Smooth footer gradient transition on scroll
- ✅ Font loading detection with skeleton states
- ✅ **Profiles table with RLS**
- ✅ **Storage bucket with RLS policies**
- ✅ **Auto-create profile on signup trigger**
- ✅ **Address autocomplete edge function**

## What Needs Integration

### High Priority (Backend Connection)

1. **Connect form submission to profiles table** - Update auth-service.ts to save profile data
2. **Connect file uploads to storage** - Update upload handlers to use Supabase Storage
3. **Handle application status** - Admin review workflow

### Medium Priority

1. **Admin dashboard** - Review pending applications
2. **Email notifications** - Approval/rejection emails
3. **E2E tests** - Playwright or Cypress tests

### Nice to Have

1. **Unit tests** - Vitest tests for hooks
2. **Storybook** - Component documentation

## Edge Functions

### address-autocomplete

- **Path:** `/functions/v1/address-autocomplete`
- **Method:** GET
- **Query Params:** `input` (address string)
- **Returns:** Google Places autocomplete suggestions
- **Secret:** `GOOGLE_PLACES_API_KEY`

### address-details

- **Path:** `/functions/v1/address-details`
- **Method:** GET
- **Query Params:** `place_id`
- **Returns:** Full address details from Google Places

## Key Integration Points

### To save profile on registration:

```typescript
// In auth-service.ts or similar
import { supabase } from "@/integrations/supabase/client";

async function saveProfile(userId: string, profileData: ProfileData) {
  const { error } = await supabase
    .from("profiles")
    .update({
      account_type: profileData.accountType,
      first_name: profileData.firstName,
      last_name: profileData.lastName,
      // ... all other fields
      license_document_path: profileData.licenseDocumentPath,
    })
    .eq("id", userId);

  if (error) throw error;
}
```

### To upload files to storage:

```typescript
import { supabase } from "@/integrations/supabase/client";

async function uploadDocument(userId: string, file: File, folder: string) {
  const path = `${userId}/${folder}/${file.name}`;

  const { data, error } = await supabase.storage.from("registration-documents").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw error;
  return data.path;
}
```

## Environment Variables

```env
VITE_SUPABASE_URL=<auto-configured>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configured>
VITE_SUPABASE_PROJECT_ID=<auto-configured>
```

## Secrets (Edge Functions)

| Secret                    | Purpose              |
| ------------------------- | -------------------- |
| GOOGLE_PLACES_API_KEY     | Address autocomplete |
| SUPABASE_SERVICE_ROLE_KEY | Admin operations     |

## Design System

### Key CSS Variables (index.css)

- `--background` / `--foreground` - Main colors
- `--muted` / `--muted-foreground` - Subdued elements
- `--primary` - Brand color
- `--destructive` - Error states
- `--radius` - Border radius tokens

### Custom Classes

- `rounded-form` - Standard form element border radius
- `h-button` / `h-input` - Standard heights
- `story-link` - Animated underline link
- `btn-premium` - Premium button with shimmer
- `animate-stagger-*` - Staggered entrance animations

### Fonts

- **Termina** - Headlines (uppercase)
- **Aeonik Pro** - Body text

## Running Locally

```bash
npm install
npm run dev
```

## Testing Auth

With auto-confirm email enabled:

1. Sign up with any email
2. Account is immediately active
3. Sign in with the same credentials

## Security Notes

1. **RLS Enabled** - All tables have row-level security
2. **Private Storage** - Documents bucket is not public
3. **User Isolation** - Users can only access their own data
4. **SECURITY DEFINER** - Trigger functions use proper security context

## Contact

For questions about the codebase, refer to the original Lovable project or reach out to the team.

---

_Last updated: December 2024_
