import { useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface DynamicTextFieldsProps {
  fields: string[];
  onUpdate: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  placeholder: (index: number) => string;
  addButtonLabel: string;
  minFields?: number;
  disabled?: boolean;
}

export const DynamicTextFields = ({
  fields,
  onUpdate,
  onAdd,
  onRemove,
  placeholder,
  addButtonLabel,
  minFields = 1,
  disabled = false,
}: DynamicTextFieldsProps) => {
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  const adjustHeight = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  // Adjust heights when fields change (e.g., pre-filled from image parsing)
  useEffect(() => {
    textareaRefs.current.forEach((textarea) => {
      adjustHeight(textarea);
    });
  }, [fields, adjustHeight]);

  const handleChange = (index: number, value: string, textarea: HTMLTextAreaElement) => {
    onUpdate(index, value);
    adjustHeight(textarea);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAdd();
      // Focus next input after brief delay
      setTimeout(() => {
        const nextTextarea = textareaRefs.current.get(index + 1);
        if (nextTextarea) nextTextarea.focus();
      }, 0);
    }
  };

  const setTextareaRef = (index: number, el: HTMLTextAreaElement | null) => {
    if (el) {
      textareaRefs.current.set(index, el);
      adjustHeight(el);
    } else {
      textareaRefs.current.delete(index);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={index} className="relative group">
            <Textarea
              ref={(el) => setTextareaRef(index, el)}
              placeholder={placeholder(index)}
              value={field}
              onChange={(e) => handleChange(index, e.target.value, e.target)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="resize-none py-1.5 text-sm min-h-0 pr-8 overflow-hidden"
              disabled={disabled}
            />
            {fields.length > minFields && !disabled && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 p-1 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-muted"
                aria-label="Fjern felt"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          onClick={onAdd}
          className="w-full h-8 border-dashed gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          {addButtonLabel}
        </Button>
      )}
    </>
  );
};
