"use client";

import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { ReactNode } from "react";

type FeedbackType = "success" | "error" | "warning" | "info";

interface ActionFeedbackProps {
  type: FeedbackType;
  title: string;
  message?: string;
  details?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
}

const typeConfig: Record<
  FeedbackType,
  { bgColor: string; textColor: string; icon: ReactNode }
> = {
  success: {
    bgColor: "bg-green-50",
    textColor: "text-green-900",
    icon: <CheckCircle2 className="size-5 text-green-600" />,
  },
  error: {
    bgColor: "bg-red-50",
    textColor: "text-red-900",
    icon: <XCircle className="size-5 text-red-600" />,
  },
  warning: {
    bgColor: "bg-amber-50",
    textColor: "text-amber-900",
    icon: <AlertCircle className="size-5 text-amber-600" />,
  },
  info: {
    bgColor: "bg-blue-50",
    textColor: "text-blue-900",
    icon: <Info className="size-5 text-blue-600" />,
  },
};

/**
 * Feedback visual para ações do usuário
 * Substitui toast genérico por feedback mais descritivo
 */
export function ActionFeedback({
  type,
  title,
  message,
  details,
  action,
  icon,
}: ActionFeedbackProps) {
  const config = typeConfig[type];

  return (
    <div
      className={`rounded-lg border p-4 ${config.bgColor}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">{icon || config.icon}</div>

        <div className="flex-1">
          <h3 className={`font-semibold ${config.textColor}`}>{title}</h3>

          {message && (
            <p className={`text-sm mt-1 ${config.textColor} opacity-75`}>{message}</p>
          )}

          {details && (
            <details className={`text-xs mt-2 ${config.textColor} opacity-60`}>
              <summary className="cursor-pointer font-medium">Detalhes</summary>
              <pre className="mt-2 p-2 bg-white rounded border border-current border-opacity-20 overflow-x-auto">
                {details}
              </pre>
            </details>
          )}

          {action && (
            <button
              onClick={action.onClick}
              className={`mt-3 text-sm font-medium underline ${config.textColor} hover:opacity-75`}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Feedback em linha para operações rápidas
 */
export function InlineActionFeedback({
  type,
  message,
}: {
  type: FeedbackType;
  message: string;
}) {
  const config = typeConfig[type];

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded">
      <span className="flex-shrink-0">{config.icon}</span>
      <span className={`text-sm ${config.textColor}`}>{message}</span>
    </div>
  );
}
