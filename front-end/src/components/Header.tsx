// import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "./NavLink";

interface HeaderProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

const Header = ({ isLoggedIn, onLogout }: HeaderProps) => {
  const appName = import.meta.env.APP_NAME || 'Mailhub';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            {/* <Mail className="h-4 w-4 text-primary-foreground" /> */}
            <img src="../../public/logo.png" className="h-8 w-8 text-primary-foreground" />
          </div>
          <span className="font-semibold">{appName}</span>
        </a>
        
        <nav className="flex items-center gap-4">
          {isLoggedIn && (
            <>
              <NavLink 
                to="/my-page" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                activeClassName="text-foreground font-medium"
              >
                My Page
              </NavLink>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
