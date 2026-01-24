import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

interface EmailInputProps {
  onSubmit: (email: string) => void;
  isLoading?: boolean;
}

const EmailInput = ({ onSubmit, isLoading }: EmailInputProps) => {
  const [email, setEmail] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(false);

  // Email regex pattern for validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = (value: string) => {
    const trimmedValue = value.trim();
    return trimmedValue !== "" && emailRegex.test(trimmedValue);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsValidEmail(validateEmail(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    // Only submit if email is valid
    if (isValidEmail && trimmedEmail) {
      onSubmit(trimmedEmail);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="email"
          placeholder="Enter the email you want to proetect"
          value={email}
          onChange={handleEmailChange}
          className="pl-10 h-12 text-base"
          required
        />
      </div>
      <Button
        type="submit"
        className="w-full h-12 text-base font-medium"
        disabled={isLoading || !isValidEmail}
      >
        {isLoading ? "Processing..." : "CREATE PRIVATE EMAIL"}
      </Button>
    </form>
  );
};

export default EmailInput;
