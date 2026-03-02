import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase/provider";

export function UserNav() {
  const router = useRouter();
  const { user, auth } = useFirebase();

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
    router.push("/");
  };

  const getInitials = (name: string | null | undefined) => {
    if (name) return name.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/10 transition-colors hover:border-primary">
            <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? "User"} />
            <AvatarFallback className="font-bold bg-secondary">
              {getInitials(user?.displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none">{user?.displayName || "Benutzer"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || "Keine E-Mail"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/settings">
            <DropdownMenuItem className="cursor-pointer">
              Einstellungen
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
          Ausloggen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
