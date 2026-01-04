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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onSubmit(email.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-10 h-12 text-base"
          required
        />
      </div>
      <Button 
        type="submit" 
        className="w-full h-12 text-base font-medium"
        disabled={isLoading || !email.trim()}
      >
        {isLoading ? "Processing..." : "ENTER"}
      </Button>
    </form>
  );
};

export default EmailInput;
