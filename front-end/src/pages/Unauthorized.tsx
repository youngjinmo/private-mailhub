import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Unauthorized = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={false} />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">401</h1>
            <h2 className="text-xl font-semibold text-muted-foreground">Unauthorized</h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            You need to be logged in to access this page. Please sign in to continue.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Unauthorized;
