import { cn } from "../lib/utils";

interface MilkLogoProps {
  className?: string;
}

export function MilkLogo({ className }: MilkLogoProps) {
  return (
    <>
      <img
        src="/brands/milk-logo-dark.png"
        alt="Milk"
        className={cn("dark:hidden", className)}
      />
      <img
        src="/brands/milk-logo-light.png"
        alt="Milk"
        className={cn("hidden dark:block", className)}
      />
    </>
  );
}
