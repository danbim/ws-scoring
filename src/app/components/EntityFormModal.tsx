import type { Component } from "solid-js";
import { createEffect, createSignal, Show } from "solid-js";

interface EntityFormModalProps {
  isOpen: boolean;
  title: string;
  entity: Record<string, unknown> | null;
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
  const [formData, setFormData] = createSignal<Record<string, unknown>>(props.entity || {});

  createEffect(() => {
    if (props.entity) {
      setFormData(props.entity);
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
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-[calc(100%-2rem)] sm:w-96 max-w-sm shadow-lg rounded-md bg-white">
          <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-4">{props.title}</h3>
          <form onSubmit={handleSubmit}>
            {props.fields.map((field) => (
              <div class="mb-4">
                <label
                  for={`field-${field.name}`}
                  class="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
                >
                  {field.label}
                  {field.required && <span class="text-red-500">*</span>}
                </label>
                {field.type === "select" ? (
                  <select
                    id={`field-${field.name}`}
                    value={formData()[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.currentTarget.value)}
                    required={field.required}
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((option) => (
                      <option value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`field-${field.name}`}
                    type={field.type}
                    value={formData()[field.name] || ""}
                    onInput={(e) =>
                      handleChange(
                        field.name,
                        field.type === "number"
                          ? Number(e.currentTarget.value)
                          : e.currentTarget.value
                      )
                    }
                    required={field.required}
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                )}
              </div>
            ))}
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-3 mt-4">
              <button
                type="button"
                onClick={props.onCancel}
                class="px-3 py-2 sm:px-4 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-3 py-2 sm:px-4 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full sm:w-auto"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};

export default EntityFormModal;
