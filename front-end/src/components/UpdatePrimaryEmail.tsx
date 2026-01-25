import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { requestUsernameChange, verifyUsernameChange } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UpdatePrimaryEmailProps {
  currentEmail: string;
  onUpdate: () => void;
}

const UpdatePrimaryEmail = ({ currentEmail, onUpdate }: UpdatePrimaryEmailProps) => {
  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const { toast } = useToast();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = (value: string) => {
    const trimmedValue = value.trim();
    return trimmedValue !== "" && emailRegex.test(trimmedValue);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewEmail(value);
    setIsValidEmail(validateEmail(value));
  };

  const handleRequestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newEmail.trim();

    if (!isValidEmail || !trimmedEmail) return;

    if (trimmedEmail === currentEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New email is same as current email",
      });
      return;
    }

    setIsLoading(true);
    try {
      await requestUsernameChange(trimmedEmail);
      setShowVerification(true);
      toast({
        title: "Success",
        description: "Verification code sent to new email",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send verification code",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationCode.length !== 6) {
      setErrorMessage("Verification code must be 6 digits");
      setShowErrorDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      await verifyUsernameChange(verificationCode);
      toast({
        title: "Success",
        description: "Email address changed successfully. Please login again.",
      });
      // Force logout and redirect
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to verify code");
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Update Primary Email</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Current email: <span className="font-medium">{currentEmail}</span>
        </p>
        <p className="text-sm text-muted-foreground mb-4">
        Updating your primary email will immediately forward all private emails to the new address.
        </p>
      </div>

      {!showVerification ? (
        <form onSubmit={handleRequestChange} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Enter new email address"
              value={newEmail}
              onChange={handleEmailChange}
              className="pl-10"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !isValidEmail}
            className="w-full"
          >
            {isLoading ? "Sending..." : "Update"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyChange} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Enter 6-digit verification code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
              pattern="[0-9]{6}"
              required
            />
            <p className="text-sm text-muted-foreground mt-2">
              Verification code sent to {newEmail}
            </p>
          </div>
          <Button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full"
          >
            {isLoading ? "Updating..." : "Update"}
          </Button>
        </form>
      )}

      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verification Failed</AlertDialogTitle>
            <AlertDialogDescription>
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UpdatePrimaryEmail;
