"use client";

import { Star, Trash2, Save, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReviewWorkspaceFilters } from "@/types/domain";

interface FilterPreset {
  id: string;
  name: string;
  filters: ReviewWorkspaceFilters;
  createdAt: number;
}

/**
 * Gerenciador de filtros salvos (presets)
 * Permite salvar e reutilizar combinações de filtros
 */
export function FilterPresets(options: {
  currentFilters: ReviewWorkspaceFilters;
  onApplyPreset: (filters: ReviewWorkspaceFilters) => void;
  onSavePreset: (name: string, filters: ReviewWorkspaceFilters) => void;
}) {
  const { currentFilters, onApplyPreset, onSavePreset } = options;
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const saved = localStorage.getItem("review-filter-presets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const savePreset = useCallback(
    (name: string) => {
      if (!name.trim()) return;

      const newPreset: FilterPreset = {
        id: Date.now().toString(),
        name: name.trim(),
        filters: currentFilters,
        createdAt: Date.now(),
      };

      const updated = [...presets, newPreset];
      setPresets(updated);

      try {
        localStorage.setItem("review-filter-presets", JSON.stringify(updated));
      } catch {
        // localStorage cheio ou indisponível
      }

      onSavePreset(name, currentFilters);
      setNewPresetName("");
      setIsSaving(false);
    },
    [currentFilters, presets, onSavePreset],
  );

  const deletePreset = useCallback(
    (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);

      try {
        localStorage.setItem("review-filter-presets", JSON.stringify(updated));
      } catch {
        // localStorage cheio ou indisponível
      }
    },
    [presets],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title="Filtros salvos">
          <Star className="size-4" />
          <span className="hidden sm:inline ml-1">Presets</span>
          {presets.length > 0 && (
            <span className="ml-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              {presets.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {presets.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Seus Presets
            </div>

            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded"
              >
                <button
                  onClick={() => onApplyPreset(preset.filters)}
                  className="flex-1 text-left text-sm"
                >
                  {preset.name}
                </button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deletePreset(preset.id)}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}

            <DropdownMenuSeparator />
          </>
        )}

        {isSaving ? (
          <div className="space-y-2 px-2 py-3">
            <input
              autoFocus
              type="text"
              placeholder="Nome do filtro..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  savePreset(newPresetName);
                }
              }}
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => savePreset(newPresetName)}
                disabled={!newPresetName.trim()}
                className="flex-1"
              >
                <Save className="size-3 mr-1" />
                Salvar
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsSaving(false);
                  setNewPresetName("");
                }}
              >
                <X className="size-3" />
              </Button>
            </div>
          </div>
        ) : (
          <DropdownMenuItem onClick={() => setIsSaving(true)}>
            <Save className="size-4 mr-2" />
            Salvar filtro atual
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
