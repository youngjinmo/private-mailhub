import { useState, useEffect } from "react";
import EmailInput from "@/components/EmailInput";
import VerificationInput from "@/components/VerificationInput";
import RelayEmailDashboard from "@/components/RelayEmailDashboard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Lock, Settings, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { sendVerificationCode, login, logout, checkAuth, getUsernameFromToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  const appName = import.meta.env.APP_NAME || 'Mailhub';
  const [authStep, setAuthStep] = useState<AuthStep>("email");
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);

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

  // Handle scroll visibility for scroll-to-top button and learn more button
  useEffect(() => {
    let showButtonTimer: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);

      // Check if features section is visible
      const featuresSection = document.getElementById('features');
      const topSection = document.getElementById('top');

      if (featuresSection && topSection && authStep === "email") {
        const featuresSectionTop = featuresSection.getBoundingClientRect().top;
        const topSectionBottom = topSection.getBoundingClientRect().bottom;

        // Clear any pending timer
        if (showButtonTimer) {
          clearTimeout(showButtonTimer);
          showButtonTimer = null;
        }

        // Hide learn more button when features section is in view
        if (featuresSectionTop <= window.innerHeight) {
          setShowLearnMore(false);
        }
        // Show learn more button when scrolled back to top section
        else if (topSectionBottom > 0) {
          // Add delay only when showing
          showButtonTimer = setTimeout(() => {
            setShowLearnMore(true);
          }, 500);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (showButtonTimer) {
        clearTimeout(showButtonTimer);
      }
    };
  }, [authStep]);

  // Show Learn More button with animation after 0.5s on initial load
  useEffect(() => {
    if (authStep === "email") {
      const timer = setTimeout(() => {
        setShowLearnMore(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowLearnMore(false);
    }
  }, [authStep]);

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authStep === "loggedIn") {
    return <RelayEmailDashboard userEmail={userEmail} onLogout={handleLogout} />;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <Header isLoggedIn={false} onLogout={handleLogout} />

        <main className="flex flex-1 flex-col">
          {/* Hero Section */}
          <section id="top" className="relative flex flex-col items-center justify-center px-4 py-16 pb-8">
            <div className="w-full max-w-4xl space-y-12">
              {authStep === "email" && (
                <>
                  {/* Hero Text */}
                  <div className="space-y-6 text-center">
                    <p className="text-sm md:text-base font-medium text-primary uppercase tracking-wider">
                      Privacy-first email protection
                    </p>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                      Your email stays yours
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                      Protect your email with masking
                      <br />
                      Manage all your emails in one place
                    </p>
                  </div>

                  {/* Email Input */}
                  <div className="max-w-md mx-auto">
                    <EmailInput
                      onSubmit={handleEmailSubmit}
                      isLoading={isLoading}
                    />
                  </div>

                  {/* Dashboard Preview Image */}
                  <div className="max-w-5xl mx-auto">
                    <div className="rounded-lg border bg-muted/50 shadow-2xl">
                      <img
                        src="/use_img.png"
                        alt="Dashboard Preview"
                        className="w-[80%] h-auto rounded-md mx-auto"
                      />
                    </div>
                  </div>
                </>
              )}

              {authStep === "verification" && (
                <div className="max-w-md mx-auto">
                  <VerificationInput
                    email={userEmail}
                    onVerify={handleVerification}
                    onBack={handleBackToEmail}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="bg-muted/30 px-4 py-16">
            <div className="container mx-auto max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold mb-3">Why Choose {appName}?</h2>
                <p className="text-muted-foreground">
                  The best way to protect your email
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Protect Your Real Email</h3>
                  <p className="text-sm text-muted-foreground">
                    Keep your real email safe from untrusted sites. Use masked email addresses for signups and subscriptions.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Encrypted Storage</h3>
                  <p className="text-sm text-muted-foreground">
                    Your email address is encrypted on our servers. Nobody can access your real address.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Centralized Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage all your mail subscriptions in one place. No need to unsubscribe from each platform individually.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">AI-Powered Summaries</h3>
                    <p className="text-sm text-muted-foreground">
                      <span className="inline-block px-2 py-0.5 text-xs bg-primary/20 rounded mb-1">Coming Soon</span><br />
                    </p>
                  </div>
                  Save time with AI-generated email summaries.
                </div>
              </div>

              <div className="mt-12 p-6 rounded-lg bg-background border">
                <h3 className="font-semibold mb-3 text-center">Privacy and Transparency</h3>
                <p className="text-sm text-muted-foreground text-center">
                  No data collection, no data sales. <br />
                  Only encrypted email address are stored, and every line of code is open-source on Github, licensed under AGPL-3.0. <br />
                  Visit our <a
                    href="https://github.com/youngjinmo/private-mailhub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: '#895BF5' }}
                  >
                    open-source repository
                  </a>
                </p>
              </div>
            </div>
          </section>
        </main>

        <Footer />

        {/* Learn More Button - Fixed at bottom center */}
        {showLearnMore && authStep === "email" && (
          <div
            className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none"
            style={{
              animation: 'fadeInUp 0.5s ease-out forwards',
            }}
          >
            <Button
              variant="default"
              size="sm"
              onClick={scrollToFeatures}
              className="flex items-center gap-2 text-white hover:opacity-90 shadow-lg pointer-events-auto"
              style={{ backgroundColor: '#895BF5' }}
            >
              <span style={{ fontSize: '0.9rem' }}>Learn More</span>
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </Button>
          </div>
        )}

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <Button
            variant="default"
            size="icon"
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 rounded-full shadow-lg z-50"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

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
