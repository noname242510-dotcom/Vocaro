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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter as AlertFooter,
  AlertDialogHeader as AlertHeader,
  AlertDialogTitle as AlertTitle,
  AlertDialogDescription as AlertDescription,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password?: string) => void;
  isUpdating: boolean;
  title: string;
  description: string;
  showPasswordField?: boolean;
  actionButtonText?: string;
  actionButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function PasswordDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isUpdating,
  title,
  description,
  showPasswordField = true,
  actionButtonText = 'Bestätigen',
  actionButtonVariant = 'default',
}: PasswordDialogProps) {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    onConfirm(password);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword(''); // Reset password on close
    }
    onOpenChange(open);
  };

  if (!showPasswordField) {
    return (
      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent aria-describedby="password-alert-description">
          <AlertHeader>
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription id="password-alert-description">{description}</AlertDescription>
          </AlertHeader>
          <AlertFooter>
            <AlertDialogCancel disabled={isUpdating}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onConfirm()}
              disabled={isUpdating}
              className={cn(buttonVariants({ variant: actionButtonVariant }))}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionButtonText}
            </AlertDialogAction>
          </AlertFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby="password-dialog-description">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="password-dialog-description">{description}</DialogDescription>
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
          <Button
            onClick={handleConfirm}
            disabled={isUpdating || !password}
            variant={actionButtonVariant}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {actionButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
