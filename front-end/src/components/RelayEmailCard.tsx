import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RelayEmailCardProps {
  email: string;
  isActive: boolean;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}

const RelayEmailCard = ({ email, isActive, onToggle, onDelete }: RelayEmailCardProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    toast.success("Email address copied to clipboard");
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center justify-between p-4 gap-3">
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
          <Switch
            checked={isActive}
            onCheckedChange={onToggle}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RelayEmailCard;
