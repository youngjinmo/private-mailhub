import { useState, useEffect } from "react";
import EmailInput from "@/components/EmailInput";
import VerificationInput from "@/components/VerificationInput";
import RelayEmailDashboard from "@/components/RelayEmailDashboard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail } from "lucide-react";
import { sendVerificationCode, login, logout, checkAuth, getUsernameFromToken } from "@/lib/api";
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
  const appName = import.meta.env.VITE_APP_NAME || 'Mailhub';
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
      const errorMsg = error instanceof Error ? error.message : "Failed to send verification code";

      // Check if error is related to unsupported email domain
      if (errorMsg.includes("Email domain not supported")) {
        setErrorMessage("Sorry, this email domain is not yet supported.");
      } else {
        setErrorMessage(errorMsg);
      }

      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (code: string) => {
    setIsLoading(true);

    try {
      await login(userEmail, code);
      setAuthStep("loggedIn");
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

  const handleLogout = async () => {
    await logout();
    setAuthStep("email");
    setUserEmail("");
  };

  // Check authentication status on component mount
  useEffect(() => {
    const initAuth = () => {
      const isAuthenticated = checkAuth();
      if (isAuthenticated) {
        const username = getUsernameFromToken();
        if (username) {
          setUserEmail(username);
          setAuthStep("loggedIn");
        }
      }
    };

    initAuth();
  }, []);

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
                  <h1 className="text-3xl font-bold tracking-tight">{appName}</h1>
                  <p className="text-muted-foreground">
                    Your email stays yours. Fully encrypted without collected.<br />
                    No tracking, no data collecting. Just encrypted email protection.
                  </p>
                </div>
                <EmailInput
                  onSubmit={handleEmailSubmit}
                  isLoading={isLoading}
                />
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
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Index;
