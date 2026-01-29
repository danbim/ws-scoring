import type { Component } from "solid-js";
import { Show } from "solid-js";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onInput: (value: string) => void;
  class?: string;
}

const SearchInput: Component<SearchInputProps> = (props) => {
  const inputId = `search-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div class={props.class}>
      <label for={inputId} class="sr-only">
        {props.placeholder || "Search"}
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            class="h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <input
          id={inputId}
          type="text"
          value={props.value}
          onInput={(e) => props.onInput(e.currentTarget.value)}
          placeholder={props.placeholder}
          class="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <Show when={props.value}>
          <button
            type="button"
            onClick={() => props.onInput("")}
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg
              class="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </Show>
      </div>
    </div>
  );
};

export default SearchInput;
