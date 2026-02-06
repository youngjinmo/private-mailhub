import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailInput from '@/components/EmailInput';
import VerificationInput from '@/components/VerificationInput';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { sendVerificationCode, login, checkAuth } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AuthStep = 'email' | 'verification';

const LoginPage = () => {
  const navigate = useNavigate();
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [userEmail, setUserEmail] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (checkAuth()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleEmailSubmit = async (email: string) => {
    setIsLoading(true);
    setUserEmail(email);

    try {
      const { isNewUser: isNew } = await sendVerificationCode(email);
      setIsNewUser(isNew);
      setAuthStep('verification');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send verification code';

      if (errorMsg.includes('Email domain not supported')) {
        setErrorMessage('Sorry, this email domain is not yet supported.');
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
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify code');
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setAuthStep('email');
    setUserEmail('');
    setIsNewUser(false);
  };

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <Header isLoggedIn={false} />

        <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-md space-y-8">
            {authStep === 'email' && (
              <>
                <div className="space-y-4 text-center">
                  <h1 className="text-3xl font-bold">Sign in to your account</h1>
                  <p className="text-muted-foreground">Enter your email address to continue</p>
                </div>
                <EmailInput onSubmit={handleEmailSubmit} isLoading={isLoading} />
              </>
            )}

            {authStep === 'verification' && (
              <VerificationInput
                email={userEmail}
                onVerify={handleVerification}
                onBack={handleBackToEmail}
                isLoading={isLoading}
                title={isNewUser ? 'Welcome!' : 'Welcome back!'}
                subtitle={
                  isNewUser ? (
                    <p>
                      We're excited to have you join us.
                      <br />
                      Enter the verification code sent to{' '}
                      <span className="font-medium text-foreground">{userEmail}</span>
                    </p>
                  ) : (
                    <p>
                      Good to see you again.
                      <br />
                      Enter the verification code sent to{' '}
                      <span className="font-medium text-foreground">{userEmail}</span>
                    </p>
                  )
                }
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

export default LoginPage;
