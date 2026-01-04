import { useState } from "react";
import EmailInput from "@/components/EmailInput";
import VerificationInput from "@/components/VerificationInput";
import RelayEmailDashboard from "@/components/RelayEmailDashboard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail } from "lucide-react";
import { sendVerificationCode, verifyCode } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AuthStep = "email" | "verification" | "loggedIn";

const Index = () => {
  const [authStep, setAuthStep] = useState<AuthStep>("email");
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const handleEmailSubmit = async (email: string) => {
    setIsLoading(true);
    setUserEmail(email);

    try {
      await sendVerificationCode(email);
      setAuthStep("verification");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send verification code");
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (code: string) => {
    setIsLoading(true);

    try {
      const isValid = await verifyCode(userEmail, code);

      if (isValid) {
        setAuthStep("loggedIn");
      } else {
        setErrorMessage("Verification code does not match. Please try again.");
        setShowErrorDialog(true);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to verify code");
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setAuthStep("email");
    setUserEmail("");
  };

  const handleLogout = () => {
    setAuthStep("email");
    setUserEmail("");
  };

  if (authStep === "loggedIn") {
    return <RelayEmailDashboard userEmail={userEmail} onLogout={handleLogout} />;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <Header isLoggedIn={false} onLogout={handleLogout} />

        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="w-full max-w-md space-y-8 text-center">
            {authStep === "email" && (
              <>
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">Email Digest</h1>
                  <p className="text-muted-foreground">
                    Protect your real email from spam.<br />
                    Receive emails safely with relay addresses.
                  </p>
                </div>
                <EmailInput onSubmit={handleEmailSubmit} isLoading={isLoading} />
              </>
            )}

            {authStep === "verification" && (
              <VerificationInput
                email={userEmail}
                onVerify={handleVerification}
                onBack={handleBackToEmail}
                isLoading={isLoading}
              />
            )}
          </div>
        </main>

        <Footer />
      </div>

      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Index;
