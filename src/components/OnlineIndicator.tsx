import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function OnlineIndicator({ isOnline, className, size = "md" }: OnlineIndicatorProps) {
  if (!isOnline) return null;

  const sizeClasses = size === "sm" ? "w-2 h-2" : "w-3 h-3";
  const ringClasses = size === "sm" ? "ring-2" : "ring-2";

  return (
    <span
      className={cn(
        "absolute rounded-full bg-green-500 ring-2 ring-background",
        sizeClasses,
        ringClasses,
        className
      )}
      title="Онлайн"
    />
  );
}
