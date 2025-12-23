import { useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DynamicTextFieldsProps {
  fields: string[];
  onUpdate: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onReorder: (fields: string[]) => void;
  placeholder: (index: number) => string;
  addButtonLabel: string;
  minFields?: number;
  disabled?: boolean;
}

interface SortableFieldProps {
  id: string;
  index: number;
  value: string;
  placeholder: string;
  canRemove: boolean;
  disabled: boolean;
  onUpdate: (value: string) => void;
  onRemove: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  setTextareaRef: (el: HTMLTextAreaElement | null) => void;
}

const SortableField = ({
  id,
  index,
  value,
  placeholder,
  canRemove,
  disabled,
  onUpdate,
  onRemove,
  onKeyDown,
  setTextareaRef,
}: SortableFieldProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(e.target.value);
    adjustHeight(e.target);
  };

  const handleRef = (el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    setTextareaRef(el);
    if (el) adjustHeight(el);
  };

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight(textareaRef.current);
    }
  }, [value, adjustHeight]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group flex items-start gap-1 ${isDragging ? "opacity-50 z-10" : ""}`}
    >
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none p-1.5 mt-1.5 rounded hover:bg-muted"
          aria-label="Dra for å endre rekkefølge"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      <div className="flex-1 relative">
        <Textarea
          ref={handleRef}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          className="resize-none py-2 text-sm !min-h-0 pr-8 overflow-hidden"
          rows={1}
          disabled={disabled}
        />
        {canRemove && !disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-muted"
            aria-label="Fjern felt"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
};

export const DynamicTextFields = ({
  fields,
  onUpdate,
  onAdd,
  onRemove,
  onReorder,
  placeholder,
  addButtonLabel,
  minFields = 1,
  disabled = false,
}: DynamicTextFieldsProps) => {
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Create stable IDs for each field based on index
  const fieldIds = fields.map((_, index) => `field-${index}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fieldIds.indexOf(active.id as string);
      const newIndex = fieldIds.indexOf(over.id as string);
      const newOrder = arrayMove(fields, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAdd();
      setTimeout(() => {
        const nextTextarea = textareaRefs.current.get(index + 1);
        if (nextTextarea) nextTextarea.focus();
      }, 0);
    }
  };

  const setTextareaRef = (index: number, el: HTMLTextAreaElement | null) => {
    if (el) {
      textareaRefs.current.set(index, el);
    } else {
      textareaRefs.current.delete(index);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <SortableField
                key={fieldIds[index]}
                id={fieldIds[index]}
                index={index}
                value={field}
                placeholder={placeholder(index)}
                canRemove={fields.length > minFields}
                disabled={disabled}
                onUpdate={(value) => onUpdate(index, value)}
                onRemove={() => onRemove(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                setTextareaRef={(el) => setTextareaRef(index, el)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
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
