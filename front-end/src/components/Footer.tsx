import { Github } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const appName = import.meta.env.VITE_APP_NAME || 'Mailhub';

  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center gap-4 py-6 px-4 mx-auto md:flex-row md:justify-between">
        <p className="text-sm text-muted-foreground">
          © {currentYear} {appName}. All rights reserved.
        </p>
        
        <div className="flex items-center gap-6">
          <a 
            href="/privacy" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </a>
          <a 
            href="mailto:dev.youngjinmo@gmail.com"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            support@email-digest.com
          </a>
          <a 
            href="https://github.com/youngjinmo/email-digest"
            target="_blank" 
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
