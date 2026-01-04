import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={false} onLogout={() => {}} />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Information We Collect</h2>
            <p>
              We collect your email address to provide our relay email service. 
              This includes your primary email address and any relay email addresses created through our service.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">How We Use Your Information</h2>
            <p>
              Your email address is used solely for authentication and forwarding emails 
              from your relay addresses to your primary email. We do not sell or share 
              your personal information with third parties.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data. 
              All email transmissions are encrypted, and we regularly update our security protocols.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:support@email-digest.com" className="text-primary hover:underline">
                support@email-digest.com
              </a>
            </p>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Privacy;
