import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, KeyRound } from "lucide-react";

interface VerificationInputProps {
  email: string;
  onVerify: (code: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const VerificationInput = ({ email, onVerify, onBack, isLoading }: VerificationInputProps) => {
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onVerify(code.trim());
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold">Enter Verification Code</h2>
        <p className="text-sm text-muted-foreground">
          We sent a verification code to<br />
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="pl-10 h-12 text-base text-center tracking-widest"
            maxLength={6}
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full h-12 text-base font-medium"
          disabled={isLoading || !code.trim()}
        >
          {isLoading ? "Verifying..." : "Verify"}
        </Button>
      </form>
      
      <p className="text-center text-sm text-muted-foreground">
        Didn't receive the code?{" "}
        <button className="text-primary hover:underline">Resend</button>
      </p>
    </div>
  );
};

export default VerificationInput;
