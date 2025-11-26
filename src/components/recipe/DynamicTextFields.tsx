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
}

export const DynamicTextFields = ({
  fields,
  onUpdate,
  onAdd,
  onRemove,
  placeholder,
  addButtonLabel,
  minFields = 1,
}: DynamicTextFieldsProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAdd();
      // Focus next input after brief delay
      setTimeout(() => {
        const allTextareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
        const currentIndex = Array.from(allTextareas).indexOf(e.currentTarget);
        const nextInput = allTextareas[currentIndex + 1];
        if (nextInput) nextInput.focus();
      }, 0);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={index} className="relative group">
            <Textarea
              placeholder={placeholder(index)}
              value={field}
              onChange={(e) => onUpdate(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              rows={1}
              className="resize-none py-2 text-sm min-h-[2.5rem] pr-8"
            />
            {fields.length > minFields && (
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
      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className="w-full h-8 border-dashed gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        {addButtonLabel}
      </Button>
    </>
  );
};
