import type { Component } from "solid-js";
import { createEffect, createSignal } from "solid-js";
import { Button } from "@/components/ui/button";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import Select from "./ui/Select";

interface EntityFormModalProps {
  isOpen: boolean;
  title: string;
  entity: object | null;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "number" | "date" | "select";
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
}

const EntityFormModal: Component<EntityFormModalProps> = (props) => {
  const [formData, setFormData] = createSignal<Record<string, unknown>>(
    (props.entity as Record<string, unknown>) || {}
  );

  createEffect(() => {
    if (props.entity) {
      setFormData(props.entity as Record<string, unknown>);
    } else {
      setFormData({});
    }
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    props.onSave(formData());
  };

  const handleChange = (name: string, value: string | number) => {
    setFormData({ ...formData(), [name]: value });
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onCancel}
      title={props.title}
      size="sm"
      footer={
        <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <Button variant="secondary" class="w-full sm:w-auto" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button type="submit" class="w-full sm:w-auto" onClick={handleSubmit}>
            Save
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {props.fields.map((field) => (
          <div class="mb-4">
            {field.type === "select" ? (
              <Select
                id={`field-${field.name}`}
                label={field.label}
                value={String(formData()[field.name] || "")}
                onChange={(e) => handleChange(field.name, e.currentTarget.value)}
                options={field.options || []}
                placeholder="Select..."
                required={field.required}
              />
            ) : (
              <Input
                id={`field-${field.name}`}
                label={field.label}
                type={field.type}
                value={formData()[field.name] as string | number}
                onInput={(e) =>
                  handleChange(
                    field.name,
                    field.type === "number" ? Number(e.currentTarget.value) : e.currentTarget.value
                  )
                }
                required={field.required}
              />
            )}
          </div>
        ))}
      </form>
    </Modal>
  );
};

export default EntityFormModal;
