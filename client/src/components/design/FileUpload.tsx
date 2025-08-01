import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UnifiedImageUploader } from "@/components/ui/UnifiedImageUploader";

interface FileUploadProps {
  designTaskId: number;
  onSuccess?: () => void;
}

export function FileUpload({ designTaskId, onSuccess }: FileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleUploadComplete = (result: any) => {
    if (result.success) {
      toast({
        title: "Design File Uploaded",
        description: "File uploaded successfully to design task",
      });
      setIsOpen(false);
      if (onSuccess) {
        onSuccess();
      }
    } else {
      toast({
        title: "Upload Failed",
        description: result.error || "An error occurred during file upload",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload Design
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Design File</DialogTitle>
          <DialogDescription>
            Upload design files for task #{designTaskId}. Supported file types include: PDF, AI, PSD, EPS, SVG, PNG, JPG.
          </DialogDescription>
        </DialogHeader>

        <UnifiedImageUploader
          uploadType="design"
          entityId={designTaskId.toString()}
          onUploadComplete={handleUploadComplete}
        />

        <div className="flex justify-end mt-4">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
