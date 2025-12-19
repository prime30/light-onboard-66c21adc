import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { PasswordInputField, PasswordStrengthMeter } from "@/components/registration/helpers/PasswordInputField";

interface PersonalInfoFormProps {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

export const PersonalInfoForm = ({
  firstName,
  lastName,
  email,
  password,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPasswordChange
}: PersonalInfoFormProps) => (
  <div className="space-y-[25px]">
    <div className="space-y-2.5 text-center animate-stagger-1">
      <div className="inline-flex items-center gap-2.5 px-[15px] py-[5px] rounded-full bg-muted border border-border/50 mb-2.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Final Step
        </span>
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        Create your account
      </h1>
      <p className="text-muted-foreground">
        Enter your details to get started
      </p>
    </div>

    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-[15px] animate-stagger-2">
        <div className="space-y-2.5 group">
          <Label htmlFor="firstName" className="text-sm font-medium label-float">
            First name
          </Label>
          <div className="input-glow input-ripple rounded-form-sm sm:rounded-form">
            <Input id="firstName" type="text" placeholder="Jane" value={firstName} onChange={e => onFirstNameChange(e.target.value)} className="h-[45px] sm:h-input rounded-form-sm sm:rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus" />
          </div>
        </div>
        <div className="space-y-2.5 group">
          <Label htmlFor="lastName" className="text-sm font-medium label-float">
            Last name
          </Label>
          <div className="input-glow input-ripple rounded-form-sm sm:rounded-form">
            <Input id="lastName" type="text" placeholder="Doe" value={lastName} onChange={e => onLastNameChange(e.target.value)} className="h-[45px] sm:h-input rounded-form-sm sm:rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus" />
          </div>
        </div>
      </div>

      <div className="space-y-2.5 animate-stagger-3 group">
        <Label htmlFor="email" className="text-sm font-medium label-float">
          Email
        </Label>
        <div className="relative group input-glow input-ripple rounded-form">
          <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
            <Mail className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
          </div>
          <Input id="email" type="email" placeholder="jane@example.com" value={email} onChange={e => onEmailChange(e.target.value)} className="h-button pl-[55px] rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus" />
        </div>
      </div>

      <div className="space-y-2.5 animate-stagger-4">
        <PasswordInputField id="password" label="Password" value={password} onChange={onPasswordChange} placeholder="Create a password" variant="signup" />
        <PasswordStrengthMeter password={password} />
      </div>
    </div>
  </div>
);
