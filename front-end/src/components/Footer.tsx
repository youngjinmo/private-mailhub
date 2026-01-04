import { Github } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center gap-4 py-6 px-4 mx-auto md:flex-row md:justify-between">
        <p className="text-sm text-muted-foreground">
          © {currentYear} Email Relay. All rights reserved.
        </p>
        
        <div className="flex items-center gap-6">
          <a 
            href="/privacy" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </a>
          <a 
            href="mailto:support@email-digest.com" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            support@email-digest.com
          </a>
          <a 
            href="https://github.com/youngjinmo" 
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
