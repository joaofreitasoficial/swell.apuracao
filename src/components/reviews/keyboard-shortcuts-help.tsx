"use client";

import React, { useState } from "react";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Shortcut {
  key: string;
  description: string;
  category: "decisão" | "navegação" | "seleção" | "arquivo";
}

const SHORTCUTS: Shortcut[] = [
  // Decisão
  { key: "M", description: "Marcar como Manter", category: "decisão" },
  { key: "E", description: "Marcar como Excluir", category: "decisão" },
  { key: "P", description: "Marcar como Pendente", category: "decisão" },
  { key: "Ctrl+Z", description: "Desfazer ação (Undo)", category: "decisão" },
  { key: "Ctrl+Y", description: "Refazer ação (Redo)", category: "decisão" },

  // Navegação
  { key: "Arrow Up", description: "Ir para transação acima", category: "navegação" },
  { key: "Arrow Down", description: "Ir para transação abaixo", category: "navegação" },
  { key: "Tab", description: "Próximo campo", category: "navegação" },
  { key: "Shift+Tab", description: "Campo anterior", category: "navegação" },

  // Seleção
  { key: "Ctrl+A", description: "Selecionar tudo (página atual)", category: "seleção" },
  { key: "Ctrl+Click", description: "Selecionar múltiplas (não contiguas)", category: "seleção" },
  { key: "Shift+Click", description: "Selecionar intervalo", category: "seleção" },

  // Arquivo
  { key: "Ctrl+E", description: "Exportar para Excel", category: "arquivo" },
  { key: "Ctrl+P", description: "Imprimir", category: "arquivo" },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  const categories = ["decisão", "navegação", "seleção", "arquivo"] as const;
  const categoryLabels: Record<typeof categories[number], string> = {
    decisão: "⚡ Decisão",
    navegação: "🧭 Navegação",
    seleção: "☑️ Seleção",
    arquivo: "📁 Arquivo",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Atalhos de teclado (Ctrl+?)"
          className="gap-2"
        >
          <Code2 className="size-4" />
          <span className="hidden sm:inline">Atalhos</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="size-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map((category) => {
            const categoryShortcuts = SHORTCUTS.filter((s) => s.category === category);

            return (
              <div key={category}>
                <h3 className="font-semibold text-sm mb-3">
                  {categoryLabels[category]}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center gap-3 p-2 rounded border border-input hover:bg-accent"
                    >
                      <kbd className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 border border-slate-700 rounded">
                        {shortcut.key}
                      </kbd>
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 text-xs text-muted-foreground border-t">
          💡 Dica: Use atalhos para revisar mais rápido!
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook para usar atalhos de teclado na ReviewWorkspace
 */
export function useKeyboardShortcuts(options: {
  onKeep?: () => void;
  onExclude?: () => void;
  onPending?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const { onKeep, onExclude, onPending, onUndo, onRedo } = options;

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Não executar se está digitando em input
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      switch (event.key.toUpperCase()) {
        case "M":
          event.preventDefault();
          onKeep?.();
          break;
        case "E":
          event.preventDefault();
          onExclude?.();
          break;
        case "P":
          event.preventDefault();
          onPending?.();
          break;
        case "Z":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (event.shiftKey) {
              onRedo?.();
            } else {
              onUndo?.();
            }
          }
          break;
        case "Y":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onRedo?.();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onKeep, onExclude, onPending, onUndo, onRedo]);
}
