import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div role="alert" className="m-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium text-red-900">Something went wrong</p>
        <p className="mt-0.5 text-red-800">{message}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
