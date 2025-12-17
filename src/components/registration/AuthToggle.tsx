interface AuthToggleProps {
  mode: "signup" | "signin";
  onModeChange: (mode: "signup" | "signin") => void;
}

export const AuthToggle = ({ mode, onModeChange }: AuthToggleProps) => {
  return (
    <div className="inline-flex bg-border rounded-full p-1">
      <button
        onClick={() => onModeChange("signup")}
        className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
          mode === "signup"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Sign up
      </button>
      <button
        onClick={() => onModeChange("signin")}
        className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
          mode === "signin"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Sign in
      </button>
    </div>
  );
};
