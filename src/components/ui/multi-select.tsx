import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  maxDisplayItems?: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = "Select items",
  className,
  maxDisplayItems = 2,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === options.length) return "All Properties";
    
    const selectedLabels = selected
      .map((val) => options.find((opt) => opt.value === val)?.label)
      .filter(Boolean);
    
    if (selectedLabels.length <= maxDisplayItems) {
      return selectedLabels.join(", ");
    }
    
    return `${selectedLabels.slice(0, maxDisplayItems).join(", ")} +${selectedLabels.length - maxDisplayItems}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between bg-background", className)}
        >
          <span className="truncate text-sm">{getDisplayText()}</span>
          <div className="flex items-center gap-1 ml-2">
            {selected.length > 0 && (
              <Badge
                variant="secondary"
                className="h-5 px-1 text-xs"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Badge>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-popover z-50" align="start">
        <div className="p-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={handleSelectAll}
          >
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                selected.length === options.length ? "opacity-100" : "opacity-0"
              )}
            />
            {selected.length === options.length ? "Deselect All" : "Select All"}
          </Button>
        </div>
        <ScrollArea className="max-h-[200px]">
          <div className="p-1">
            {options.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleToggle(option.value)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selected.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{option.label}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
