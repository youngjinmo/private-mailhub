import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deactivateAccount, logout } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const DeactivateAccount = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleDeactivate = async () => {
    setIsLoading(true);
    try {
      await deactivateAccount();
      toast({
        title: "Account Deactivated",
        description: "Your account has been deactivated. You will be redirected to the home page.",
      });
      // Logout and redirect
      await logout();
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to deactivate account",
      });
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Deactivate Account</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Once deactivated, all your private emails will be disabled. <br />
          Your account will be permanently deleted after 30 days.
        </p>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            Deactivate Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This action will deactivate your account immediately.</p>
              <p>All private emails will be disabled and you will be logged out.</p>
              <p className="font-semibold">
                After 30 days, your account will be removed permanently.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? "Deactivating..." : "Confirm Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeactivateAccount;
