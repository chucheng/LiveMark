import { Plugin } from "prosemirror-state";
import { schema } from "../schema";
import { invoke } from "@tauri-apps/api/core";

/**
 * Plugin that handles image drag-and-drop and paste into the editor.
 */
export function imageDropPastePlugin(): Plugin {
  return new Plugin({
    props: {
      handleDrop(view, event) {
        if (!event.dataTransfer?.files?.length) return false;

        const file = Array.from(event.dataTransfer.files).find((f) =>
          f.type.startsWith("image/")
        );
        if (!file) return false;

        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!coords) return false;

        handleImageFile(file).then((src) => {
          if (src && view.dom.isConnected) {
            try {
              const node = schema.nodes.image.create({ src, alt: file.name });
              // Clamp position to current doc size (doc may have changed during async save)
              const maxPos = view.state.doc.content.size;
              const pos = coords.pos <= maxPos ? coords.pos : view.state.selection.from;
              const tr = view.state.tr.insert(pos, node);
              view.dispatch(tr);
            } catch {
              // View or doc changed too much during async — drop silently
            }
          }
        });
        return true;
      },

      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;

            handleImageFile(file).then((src) => {
              if (src && view.dom.isConnected) {
                try {
                  const node = schema.nodes.image.create({ src, alt: file.name || "pasted-image" });
                  const tr = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(tr);
                } catch {
                  // View or doc changed too much during async — drop silently
                }
              }
            });
            return true;
          }
        }

        // Check for pasted image URL in text
        const text = event.clipboardData?.getData("text/plain")?.trim();
        if (text && /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(text)) {
          event.preventDefault();
          const node = schema.nodes.image.create({ src: text, alt: "" });
          const tr = view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr);
          return true;
        }

        return false;
      },
    },
  });
}

async function handleImageFile(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buffer));
    const filename = file.name || `image-${Date.now()}.png`;

    // Save via Rust command; returns the absolute path
    const savedPath = await invoke<string>("save_image", {
      filename,
      data,
    });
    return savedPath;
  } catch (err) {
    console.error("Failed to save dropped/pasted image:", err);
    return null;
  }
}
