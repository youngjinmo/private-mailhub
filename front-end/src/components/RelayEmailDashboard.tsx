import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RelayEmailCard from "./RelayEmailCard";
import Header from "./Header";
import Footer from "./Footer";

interface RelayEmail {
  id: string;
  email: string;
  isActive: boolean;
}

interface RelayEmailDashboardProps {
  userEmail: string;
  onLogout: () => void;
}

const generateRandomEmail = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${result}@relay.email`;
};

const RelayEmailDashboard = ({ userEmail, onLogout }: RelayEmailDashboardProps) => {
  const [relayEmails, setRelayEmails] = useState<RelayEmail[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    setIsCreating(true);
    setTimeout(() => {
      const newEmail: RelayEmail = {
        id: crypto.randomUUID(),
        email: generateRandomEmail(),
        isActive: true,
      };
      setRelayEmails((prev) => [newEmail, ...prev]);
      setIsCreating(false);
    }, 500);
  };

  const handleToggle = (id: string, active: boolean) => {
    setRelayEmails((prev) =>
      prev.map((email) =>
        email.id === id ? { ...email, isActive: active } : email
      )
    );
  };

  const handleDelete = (id: string) => {
    setRelayEmails((prev) => prev.filter((email) => email.id !== id));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={true} onLogout={onLogout} />
      
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Relay Emails</h1>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </div>

        <Button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full h-12"
        >
          <Plus className="h-5 w-5 mr-2" />
          {isCreating ? "Creating..." : "Create New Relay Email"}
        </Button>

        <div className="space-y-3">
          {relayEmails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No relay emails created yet.</p>
              <p className="text-sm mt-1">Click the button above to create a new relay email.</p>
            </div>
          ) : (
            relayEmails.map((relayEmail) => (
              <RelayEmailCard
                key={relayEmail.id}
                email={relayEmail.email}
                isActive={relayEmail.isActive}
                onToggle={(active) => handleToggle(relayEmail.id, active)}
                onDelete={() => handleDelete(relayEmail.id)}
              />
            ))
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RelayEmailDashboard;
