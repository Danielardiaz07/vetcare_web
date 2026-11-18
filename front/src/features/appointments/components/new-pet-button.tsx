import { Icon } from "@/components/ui/icon";

export function NewPetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 self-start rounded-control border border-dashed border-brand-500 bg-brand-50 px-4 py-2 font-semibold text-brand-700 transition-colors duration-150 ease-out hover:border-brand-600 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <Icon name="plus" className="size-4 shrink-0" />
      Nueva mascota
    </button>
  );
}
