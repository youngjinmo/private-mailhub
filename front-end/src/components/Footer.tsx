const Footer = () => {
  const currentYear = new Date().getFullYear();
  const appName = import.meta.env.APP_NAME || 'Mailhub';
  const appDomain = import.meta.env.APP_DOMAIN || 'private-mailhub.com';

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-y-4 gap-x-6 py-6 px-4">
        <p className="text-sm text-muted-foreground">
          © {currentYear} {appName}. All rights reserved.
        </p>
        
        <a
          href="mailto:contact@private-mailhub.com"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          contact@{appDomain}
        </a>
      </div>
    </footer>
  );
};

export default Footer;
