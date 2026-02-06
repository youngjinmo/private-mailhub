import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, KeyRound } from 'lucide-react';

interface VerificationInputProps {
  email: string;
  onVerify: (code: string) => void;
  onBack: () => void;
  isLoading?: boolean;
  title?: string;
  subtitle?: React.ReactNode;
}

const VerificationInput = ({
  email,
  onVerify,
  onBack,
  isLoading,
  title,
  subtitle,
}: VerificationInputProps) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onVerify(code.trim());
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="rounded-lg border bg-card p-6 space-y-5">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">{title || 'Enter Verification Code'}</h2>
          {subtitle ? (
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              We sent a verification code to
              <br />
              <span className="font-medium text-foreground">{email}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter 6-digit code"
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
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Didn't receive the code? <button className="text-primary hover:underline">Resend</button>
        </p>
      </div>
    </div>
  );
};

export default VerificationInput;
