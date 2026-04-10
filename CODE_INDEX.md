# Code Index

> Quick-reference map for AI agents. Read this before grepping.

## Architecture Overview

**App type**: Multi-step registration / auth modal for a Shopify store, embedded via iframe.
**Stack**: React 18 + Vite 5 + Tailwind v3 + TypeScript 5. Backend via Supabase Edge Functions.
**Routing**: `react-router-dom` v6. All auth routes nest inside `RegistrationLayout`.

---

## Directory Map

### `src/pages/` — Route entry points
| File | Route | Purpose |
|------|-------|---------|
| `Auth.tsx` | `/auth` | Main registration wizard (multi-step form) |
| `AuthPage.tsx` | wrapper | Provides form + step context around Auth |
| `LoginPage.tsx` | `/login` | Sign-in form (lazy loaded) |
| `ActivateAccountPage.tsx` | `/activate-account` | Shopify account activation flow |
| `ResetPasswordPage.tsx` | `/reset-password` | Shopify password reset flow |
| `AlreadyLoggedInPage.tsx` | `/already-logged-in` | Redirect landing for logged-in users |
| `Index.tsx` | `/` | Root redirect |
| `BlogResaleLicense.tsx` | `/blog/resale-license` | Static blog page |
| `Reviews.tsx` | `/reviews` | Reviews page |
| `NotFound.tsx` | `*` | 404 |

### `src/components/registration/` — Core registration UI
| File | Purpose |
|------|---------|
| `RegistrationLayout.tsx` | Shared layout: LeftPanel + RightPanel + Outlet |
| `LeftPanel.tsx` | Dark left column with carousel, features, progress |
| `AuthToggle.tsx` | Apply / Login tab switcher |
| `AuthFooter.tsx` | Bottom nav (back/next buttons) |
| `StepIndicatorBar.tsx` | Step progress dots in header |
| `CloseButton.tsx` | Close modal button |
| `FadeText.tsx` | Thin wrapper for semantic tags (forwardRef) |
| `AuthBootFallback.tsx` | Suspense fallback — right panel skeleton only |
| `FormSkeleton.tsx` | Per-step loading skeletons (variant-based) |
| `TextSkeleton.tsx` | Inline shimmer placeholder |
| `FileUpload.tsx` | Single file upload with preview |
| `MultiFileUpload.tsx` | Multi-file upload with thumbnails |
| `FilePreviewThumbnail.tsx` | Image thumbnail for uploads |
| `FileSummary.tsx` | File metadata display |
| `MobileDragHandle.tsx` | Bottom sheet drag affordance |
| `MobileSavingProgress.tsx` | Mobile save indicator |
| `StepValidationIcon.tsx` | Check/error icon per step |
| `ActivateAccountForm.tsx` | Account activation form component |
| `ResetPasswordForm.tsx` | Password reset form component |

### `src/components/registration/steps/` — Form steps (rendered inside Auth.tsx)
| File | Step |
|------|------|
| `OnboardingForm.tsx` | Landing / get-started screen |
| `AccountTypeForm.tsx` | Licensed pro / student / school |
| `ContactBasicsStep.tsx` | Name, phone, preferences |
| `LicenseStep.tsx` | License number + document upload |
| `SchoolInfoStep.tsx` | School name/state + enrollment proof |
| `BusinessLocationStep.tsx` | Business address |
| `BusinessOperationStep.tsx` | Salon type selection |
| `PreferencesStep.tsx` | Birthday, social handle |
| `TaxExemptionStep.tsx` | Tax exempt document |
| `WholesaleTermsStep.tsx` | Terms agreement |
| `SummaryForm.tsx` | Review all info before submit |
| `SuccessForm.tsx` | Post-submission confirmation |
| `SignInForm.tsx` | Login form |

### `src/components/registration/helpers/` — Left panel sub-components
| File | Purpose |
|------|---------|
| `AnimatedCounters.tsx` | OdometerCounter + RotatingStylistAvatars |
| `CircularProgress.tsx` | Radial progress ring (top-right of left panel) |
| `MagneticFeatureBox.tsx` | Hover-magnetic feature pills |
| `MarqueeBadges.tsx` | Scrolling badge strip (unused?) |
| `TestimonialCarousel.tsx` | Auto-rotating testimonial quotes |

### `src/components/registration/context/` — State management
| File | Purpose |
|------|---------|
| `FormContext.tsx` | react-hook-form provider + field persistence |
| `FormDataContext.tsx` | Cross-step form data (account type, etc.) |
| `ModeContext.tsx` | "signin" vs "signup" mode |
| `StepContext.tsx` | Current step + navigation |
| `RegistrationContext.tsx` | Combined registration state |

### `src/hooks/` — Custom hooks
| File | Purpose |
|------|---------|
| `use-iframe-comm.ts` | PostMessage communication with Shopify parent |
| `use-api-client.ts` | Fetch wrapper for edge functions |
| `use-address-autocomplete.tsx` | Google Places autocomplete |
| `use-mobile.tsx` | Responsive breakpoint detection |
| `use-modal-swipe.ts` | Bottom sheet swipe-to-dismiss |
| `use-magnetic.tsx` | Magnetic hover effect for elements |
| `use-countdown.tsx` | Timer for rate-limiting UI |
| `use-font-loaded.tsx` | Font load detection |
| `use-safari-viewport-fix.ts` | iOS viewport height fix |
| `use-scroll.ts` | Scroll position tracking |
| `messages.ts` | PostMessage type definitions |

### `src/lib/` — Utilities
| File | Purpose |
|------|---------|
| `utils.ts` | `cn()` class merger |
| `error-parser.ts` | API error response parsing |
| `imageCompression.ts` | Client-side image compression before upload |
| `scroll-to-error.ts` | Auto-scroll to first validation error |
| `validations/auth-schemas.ts` | Zod schemas for auth forms |
| `validations/password-schemas.ts` | Password validation (min 5 chars) |
| `validations/file-schema.ts` | File upload validation |
| `validations/form-utils.ts` | Shared form validation helpers |

### `src/data/` — Static data
| File | Purpose |
|------|---------|
| `auth-constants.ts` | Carousel slide content + feature pills data |
| `step-order.ts` | Step sequence definitions per account type |
| `country-codes.ts` | Phone country codes |
| `locations.ts` | US states list |
| `allowed-origins.ts` | Allowed iframe parent origins |

### `src/services/` — API service layer
| File | Purpose |
|------|---------|
| `address.ts` | Address autocomplete + details API calls |
| `file.ts` | File upload to edge function |

### `src/contexts/` — Global providers
| File | Purpose |
|------|---------|
| `GlobalAppProvider.tsx` | QueryClient + Tooltip + Jotai provider |
| `UploadFileProvider.tsx` | File upload state management |
| `store.ts` | Jotai atoms (global state) |

### `supabase/functions/` — Edge functions
| Function | Purpose |
|----------|---------|
| `create-customer/` | Creates Shopify customer + Supabase profile |
| `upload-file/` | Handles file uploads to Supabase storage |
| `get-image/` | Retrieves stored images |
| `activate-account/` | Shopify account activation proxy |
| `reset-password/` | Shopify password reset proxy |
| `address-autocomplete/` | Google Places autocomplete proxy |
| `address-details/` | Google Places details proxy |

### `supabase/lib/` — Shared edge function utilities
| File | Purpose |
|------|---------|
| `corsHeaders.ts` | CORS headers for edge functions |
| `sendError.ts` | Standardized error responses |
| `validateRequestMethod.ts` | Method validation middleware |
| `parseRequestBody.ts` | JSON body parsing |
| `caseConverter.ts` | camelCase ↔ snake_case conversion |
| `phoneUtils.ts` | Phone number formatting |
| `types.ts` | Shared TypeScript types |

---

## Key Files by Concern

### Styling
- `src/index.css` — All CSS variables, design tokens, animations, keyframes
- `tailwind.config.ts` — Tailwind theme extensions
- `design-system/` — Portable design system (reference only)

### Boot / Loading
- `index.html` — Static boot skeleton (CSS-only, pre-React)
- `AuthBootFallback.tsx` — React Suspense fallback (right panel only)
- `FormSkeleton.tsx` — Per-step skeletons

### Iframe Communication
- `use-iframe-comm.ts` — All postMessage logic
- `messages.ts` — Message type definitions
- `allowed-origins.ts` — Security whitelist

### Image Assets
- `src/assets/salon-hero.jpg` — Left panel hero (49KB, 576×1024)
- `src/assets/slide-products.jpg` — Carousel slide 2 (89KB, 1024×1024)
- `src/assets/slide-community.jpg` — Carousel slide 3 (100KB, 1024×1024)
- `src/assets/avatars/` — Stylist avatar thumbnails
