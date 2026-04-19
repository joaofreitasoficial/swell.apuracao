"use client";

import React, { useEffect } from "react";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateBatchSelection } from "@/lib/validations/batch-actions";

interface BatchActionValidatorProps {
  selectedCount: number;
  onValidationChange?: (valid: boolean) => void;
}

export function BatchActionValidator({
  selectedCount,
  onValidationChange,
}: BatchActionValidatorProps) {
  const validation = validateBatchSelection(
    Array(selectedCount).fill("").map((_, i) => i.toString()),
  );

  // Notificar ao componente pai se validation mudou
  useEffect(() => {
    onValidationChange?.(validation.valid);
  }, [validation.valid, onValidationChange]);

  if (!validation.error && !validation.warning) {
    return null;
  }

  if (validation.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{validation.error}</AlertDescription>
      </Alert>
    );
  }

  if (validation.warning) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertDescription>{validation.warning}</AlertDescription>
      </Alert>
    );
  }

  return null;
}

// Utilidade: renderizar apenas se houver erro/warning
export function BatchActionValidationOnly({
  selectedCount,
  showWarnings = true,
}: {
  selectedCount: number;
  showWarnings?: boolean;
}) {
  const validation = validateBatchSelection(
    Array(selectedCount).fill("").map((_, i) => i.toString()),
  );

  if (!validation.valid) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="size-4" />
        <AlertDescription>{validation.error}</AlertDescription>
      </Alert>
    );
  }

  if (showWarnings && validation.warning) {
    return (
      <Alert className="mb-4">
        <Info className="size-4" />
        <AlertDescription>{validation.warning}</AlertDescription>
      </Alert>
    );
  }

  return null;
}
