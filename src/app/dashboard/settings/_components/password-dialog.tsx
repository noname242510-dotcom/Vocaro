'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface PasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => void;
  isUpdating: boolean;
  title: string;
  description: string;
}

export function PasswordDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isUpdating,
  title,
  description,
}: PasswordDialogProps) {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    if (password) {
      onConfirm(password);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword(''); // Reset password on close
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password-confirm" className="text-right">
              Passwort
            </Label>
            <Input
              id="password-confirm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="col-span-3"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={isUpdating || !password}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
