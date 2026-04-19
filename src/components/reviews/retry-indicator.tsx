"use client";

import { AlertCircle, RotateCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface RetryIndicatorProps {
  isRetrying: boolean;
  error: Error | null;
  lastAttempt?: number;
  onRetry?: () => void;
}

export function RetryIndicator({
  isRetrying,
  error,
  lastAttempt,
  onRetry,
}: RetryIndicatorProps) {
  if (!error && !isRetrying) {
    return null;
  }

  if (isRetrying) {
    return (
      <Alert>
        <RotateCw className="size-4 animate-spin" />
        <AlertDescription>
          Tentando novamente...
          {lastAttempt ? ` (tentativa ${lastAttempt}/3)` : ""}
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <div className="flex items-center justify-between">
          <AlertDescription>{error.message}</AlertDescription>
          {onRetry && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRetry}
              className="ml-2"
            >
              <RotateCw className="size-3 mr-1" />
              Tentar novamente
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  return null;
}
