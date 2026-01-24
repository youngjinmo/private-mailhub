import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RelayEmailCard from "./RelayEmailCard";
import Header from "./Header";
import Footer from "./Footer";
import { toast } from "sonner";
import {
  getRelayEmails,
  createRelayEmail,
  updateRelayEmailDescription,
  updateRelayEmailActiveStatus,
  type RelayEmail,
} from "@/lib/api";

interface RelayEmailDashboardProps {
  userEmail: string;
  onLogout: () => void;
}

const RelayEmailDashboard = ({ userEmail, onLogout }: RelayEmailDashboardProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch relay emails
  const { data: relayEmails = [], isLoading } = useQuery({
    queryKey: ["relayEmails"],
    queryFn: getRelayEmails,
  });

  // Create relay email mutation
  const createMutation = useMutation({
    mutationFn: () => createRelayEmail(userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relayEmails"] });
      toast.success("Relay email created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create relay email");
    },
  });

  // Update description mutation
  const updateDescriptionMutation = useMutation({
    mutationFn: ({ id, description }: { id: string; description: string }) =>
      updateRelayEmailDescription(id, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relayEmails"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update description");
    },
  });

  // Update active status mutation
  const updateActiveStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateRelayEmailActiveStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relayEmails"] });
      toast.success("Status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createMutation.mutateAsync();
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = (id: string, isActive: boolean) => {
    updateActiveStatusMutation.mutate({ id, isActive });
  };

  const handleUpdateDescription = async (id: string, description: string) => {
    await updateDescriptionMutation.mutateAsync({ id, description });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={true} onLogout={onLogout} />

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Private Emails</h1>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </div>

        <Button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full h-12"
        >
          <Plus className="h-5 w-5 mr-2" />
          {isCreating ? "Creating..." : "Create New Private Email"}
        </Button>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Loading relay emails...</p>
          </div>
        ) : relayEmails.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No relay emails created yet.</p>
            <p className="text-sm mt-1">Click the button above to create a new relay email.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {relayEmails.map((relayEmail) => (
              <RelayEmailCard
                key={relayEmail.id}
                id={relayEmail.id}
                email={relayEmail.relayAddress}
                description={relayEmail.description}
                isActive={relayEmail.isActive}
                onToggle={(active) => handleToggle(relayEmail.id, active)}
                onUpdateDescription={(description) =>
                  handleUpdateDescription(relayEmail.id, description)
                }
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default RelayEmailDashboard;
