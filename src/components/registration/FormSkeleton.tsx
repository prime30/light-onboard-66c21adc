import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FormSkeletonProps {
  variant?: "default" | "account-type" | "license" | "location" | "terms" | "contact" | "business-operation";
}

export const FormSkeleton = ({ variant = "default" }: FormSkeletonProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-3 text-center">
        {/* Badge */}
        <div className="flex justify-center">
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        {/* Title */}
        <Skeleton className="h-10 w-3/4 mx-auto rounded-lg" />
        {/* Subtitle */}
        <Skeleton className="h-5 w-1/2 mx-auto rounded-md" />
      </div>

      {/* Content skeleton based on variant */}
      {variant === "account-type" && <AccountTypeSkeleton />}
      {variant === "license" && <LicenseSkeleton />}
      {variant === "location" && <LocationSkeleton />}
      {variant === "terms" && <TermsSkeleton />}
      {variant === "contact" && <ContactSkeleton />}
      {variant === "business-operation" && <BusinessOperationSkeleton />}
      {variant === "default" && <DefaultSkeleton />}
    </div>
  );
};

const AccountTypeSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="p-5 rounded-[20px] border border-border/30"
        style={{ animationDelay: `${i * 50}ms` }}
      >
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-[15px] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const LicenseSkeleton = () => (
  <div className="space-y-5">
    {/* Info box */}
    <div className="p-5 rounded-[15px] border border-border/30 flex gap-4">
      <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
    {/* Input field */}
    <div className="space-y-2.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-[55px] w-full rounded-[15px]" />
    </div>
    {/* Additional fields */}
    <div className="space-y-2.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[50px] w-full rounded-[15px]" />
    </div>
  </div>
);

const LocationSkeleton = () => (
  <div className="space-y-4">
    {/* Business name */}
    <div className="space-y-2.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[50px] w-full rounded-[15px]" />
    </div>
    {/* Address row */}
    <div className="grid grid-cols-3 gap-2.5">
      <div className="col-span-2 space-y-2.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-[50px] w-full rounded-[15px]" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-[50px] w-full rounded-[15px]" />
      </div>
    </div>
    {/* Country and city */}
    <div className="grid grid-cols-2 gap-2.5">
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-[50px] w-full rounded-[15px]" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-[50px] w-full rounded-[15px]" />
      </div>
    </div>
    {/* State and zip */}
    <div className="grid grid-cols-2 gap-2.5">
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-[50px] w-full rounded-[15px]" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-[50px] w-full rounded-[15px]" />
      </div>
    </div>
  </div>
);

const TermsSkeleton = () => (
  <div className="space-y-5">
    {/* Info box */}
    <div className="p-5 rounded-[15px] border border-border/30 flex gap-4">
      <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
    {/* Agreement button */}
    <div className="p-5 rounded-[15px] border border-border/30 flex items-center gap-4">
      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  </div>
);

const ContactSkeleton = () => (
  <div className="space-y-4">
    {/* Name row */}
    <div className="grid grid-cols-2 gap-2.5">
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-[50px] w-full rounded-[15px]" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-[50px] w-full rounded-[15px]" />
      </div>
    </div>
    {/* Preferred name */}
    <div className="space-y-2.5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-[50px] w-full rounded-[15px]" />
    </div>
    {/* Phone */}
    <div className="space-y-2.5">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-[50px] w-full rounded-[15px]" />
    </div>
    {/* Checkboxes */}
    <div className="space-y-3 pt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-4 w-48" />
        </div>
      ))}
    </div>
  </div>
);

const BusinessOperationSkeleton = () => (
  <div className="space-y-3">
    {[1, 2].map((i) => (
      <div
        key={i}
        className="p-5 rounded-[15px] border border-border/30 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Skeleton className="w-5 h-5 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-[12px]" />
      </div>
    ))}
  </div>
);

const DefaultSkeleton = () => (
  <div className="space-y-5">
    {/* Input fields */}
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-2.5" style={{ animationDelay: `${i * 50}ms` }}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-[50px] w-full rounded-[15px]" />
      </div>
    ))}
  </div>
);

export default FormSkeleton;
