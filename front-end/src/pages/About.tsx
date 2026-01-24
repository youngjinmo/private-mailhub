import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Mail, Zap } from "lucide-react";

const About = () => {
  const appName = import.meta.env.VITE_APP_NAME || 'Mailhub';

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={false} onLogout={() => {}} />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">About {appName}</h1>
        <p className="text-lg text-muted-foreground mb-12">
          Protect your inbox from spam while staying connected.
        </p>
        
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Privacy First</h3>
            <p className="text-sm text-muted-foreground">
              Keep your real email address private. Use relay addresses for signups and subscriptions.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Unlimited Aliases</h3>
            <p className="text-sm text-muted-foreground">
              Create as many relay email addresses as you need. Disable or delete them anytime.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Instant Forwarding</h3>
            <p className="text-sm text-muted-foreground">
              Emails sent to your relay addresses are instantly forwarded to your primary inbox.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
