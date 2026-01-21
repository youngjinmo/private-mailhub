import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RelayEmailCardProps {
  id: string;
  email: string;
  description: string | null;
  isActive: boolean;
  onToggle: (active: boolean) => void;
  onUpdateDescription: (description: string) => void;
}

const RelayEmailCard = ({
  id,
  email,
  description,
  isActive,
  onToggle,
  onUpdateDescription,
}: RelayEmailCardProps) => {
  const [localDescription, setLocalDescription] = useState(description || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    toast.success("Email address copied to clipboard");
  };

  const handleSaveDescription = async () => {
    if (localDescription.length > 20) {
      toast.error("Description must be less than 20 characters");
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateDescription(localDescription);
      toast.success("Description updated");
    } catch (error) {
      toast.error("Failed to update description");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Switch checked={isActive} onCheckedChange={onToggle} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Add memo (max 20 chars)"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            maxLength={20}
            className="flex-1 h-8 text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSaveDescription}
            disabled={isUpdating}
            className="h-8 w-8"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RelayEmailCard;
