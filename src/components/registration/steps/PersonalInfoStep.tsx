import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Email validation helper
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface PersonalInfoStepProps {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

export const PersonalInfoStep = ({
  firstName,
  lastName,
  email,
  password,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPasswordChange,
}: PersonalInfoStepProps) => {
  const [emailTouched, setEmailTouched] = useState(false);
  const emailIsValid = isValidEmail(email);
  const showEmailError = emailTouched && email.trim() !== "" && !emailIsValid;

  return (
    <div className="animate-slide-in-right max-w-md mx-auto">
      <div className="text-center mb-8">
        <p className="text-sm text-muted-foreground mb-2">Step 2 of 3</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          Create your account
        </h1>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium">
              First name
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Jane"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              className="h-12 rounded-xl border-border bg-card px-4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium">
              Last name
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              className="h-12 rounded-xl border-border bg-card px-4"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            className={`h-12 rounded-xl border-border bg-card px-4 ${showEmailError ? 'border-destructive ring-2 ring-destructive/20' : ''}`}
          />
          {showEmailError && (
            <p className="text-xs text-destructive animate-slide-in-right">Please enter a valid email address</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="h-12 rounded-xl border-border bg-card px-4"
          />
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters
          </p>
        </div>
      </div>
    </div>
  );
};