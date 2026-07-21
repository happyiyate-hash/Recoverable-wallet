'use client';

import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { KeyRound, LogOut } from 'lucide-react';

interface MoreActionsSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export default function MoreActionsSheet({ isOpen, onOpenChange }: MoreActionsSheetProps) {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
    onOpenChange(false);
  };

  const handleLogout = () => {
    // In a real app, this would clear authentication state
    alert("Logged out!");
    onOpenChange(false);
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>More Actions</SheetTitle>
          <SheetDescription>
            Additional options and settings.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-4">
            <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleNavigate('/settings/api-keys')}
            >
                <KeyRound className="w-4 h-4" />
                Manage API Keys
            </Button>
             <Button
                variant="destructive"
                className="w-full justify-start gap-3"
                onClick={handleLogout}
            >
                <LogOut className="w-4 h-4" />
                Exit Wallet
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
