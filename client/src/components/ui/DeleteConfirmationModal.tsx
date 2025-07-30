import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  itemType: 'catalog-item' | 'order' | 'customer' | 'organization' | 'generic';
  requiresTyping?: boolean; // For high-risk deletions
  isDeleting?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  itemType,
  requiresTyping = false,
  isDeleting = false
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isValid, setIsValid] = useState(!requiresTyping);

  const getWarningDetails = () => {
    switch (itemType) {
      case 'catalog-item':
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-400/30',
          icon: AlertTriangle,
          risks: [
            'This catalog item will be permanently deleted',
            'Any orders referencing this item may be affected',
            'Product pricing and specifications will be lost',
            'This action cannot be undone after 5 seconds'
          ]
        };
      case 'order':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-400/30',
          icon: AlertTriangle,
          risks: [
            'This order and all associated data will be deleted',
            'Customer order history will be permanently affected',
            'Production tasks and design files may be lost',
            'Payment and billing records may be impacted',
            'This action cannot be undone after 5 seconds'
          ]
        };
      case 'customer':
        return {
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-400/30',
          icon: AlertTriangle,
          risks: [
            'Customer profile will be permanently deleted',
            'All associated orders may be affected',
            'Contact information and history will be lost',
            'This action cannot be undone after 5 seconds'
          ]
        };
      default:
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-400/30',
          icon: AlertTriangle,
          risks: [
            'This item will be permanently deleted',
            'This action cannot be undone after 5 seconds'
          ]
        };
    }
  };

  const warningDetails = getWarningDetails();
  const IconComponent = warningDetails.icon;

  React.useEffect(() => {
    if (requiresTyping && itemName) {
      setIsValid(confirmationText.trim() === itemName.trim());
    }
  }, [confirmationText, itemName, requiresTyping]);

  const handleConfirm = () => {
    if (isValid) {
      onConfirm();
      setConfirmationText('');
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    setIsValid(!requiresTyping);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-rich-black/95 backdrop-blur-md border border-glass-border max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center ${warningDetails.color}`}>
            <IconComponent className="w-5 h-5 mr-2" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className={`p-4 rounded-lg ${warningDetails.bgColor} border ${warningDetails.borderColor}`}>
          <h4 className={`font-medium mb-3 ${warningDetails.color} flex items-center`}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Warning: This action has serious consequences
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {warningDetails.risks.map((risk, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-400 mr-2">•</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>

        {requiresTyping && itemName && (
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Type "{itemName}" to confirm deletion:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Type "${itemName}" here`}
              className="bg-rich-black/50 border-glass-border"
              autoFocus
            />
            {requiresTyping && confirmationText && !isValid && (
              <p className="text-sm text-red-400">
                Text must match exactly: "{itemName}"
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationModal;