/**
 * ProfileModal - Modal de perfil do usuário
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userEmail,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground">
            {userEmail || "Usuário não identificado"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
