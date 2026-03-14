import { Plugin } from "prosemirror-state";
import { schema } from "../schema";
import { invoke } from "@tauri-apps/api/core";
import { documentState } from "../../state/document";
import { uiState } from "../../state/ui";

/** Maximum image file size (20 MB). */
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
/** Maximum number of images per single paste/drop. */
const MAX_IMAGES_PER_DROP = 10;
/** Maximum plain-text paste size (5 MB). */
const MAX_PASTE_TEXT_SIZE = 5 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/**
 * Plugin that handles image drag-and-drop and paste into the editor.
 */
export function imageDropPastePlugin(): Plugin {
  return new Plugin({
    props: {
      handleDrop(view, event) {
        if (!event.dataTransfer?.files?.length) return false;

        const images = Array.from(event.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (images.length === 0) return false;

        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!coords) return false;

        // Limit number of images per drop
        if (images.length > MAX_IMAGES_PER_DROP) {
          uiState.showStatus(`Too many images (${images.length}). Maximum ${MAX_IMAGES_PER_DROP} per drop.`);
        }
        const toProcess = images.slice(0, MAX_IMAGES_PER_DROP);

        // Only process first image for drop (insert at drop position)
        const file = toProcess[0];
        handleImageFile(file).then((src) => {
          if (src && view.dom.isConnected) {
            try {
              const node = schema.nodes.image.create({ src, alt: file.name });
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

        // Collect all image items
        const imageItems: File[] = [];
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) imageItems.push(file);
          }
        }

        if (imageItems.length > 0) {
          event.preventDefault();

          if (imageItems.length > MAX_IMAGES_PER_DROP) {
            uiState.showStatus(`Too many images (${imageItems.length}). Maximum ${MAX_IMAGES_PER_DROP} per paste.`);
          }
          const toProcess = imageItems.slice(0, MAX_IMAGES_PER_DROP);

          // Process each image sequentially
          let chain = Promise.resolve();
          for (const file of toProcess) {
            chain = chain.then(async () => {
              const src = await handleImageFile(file);
              if (src && view.dom.isConnected) {
                try {
                  const node = schema.nodes.image.create({ src, alt: file.name || "pasted-image" });
                  const tr = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(tr);
                } catch {
                  // View changed — skip
                }
              }
            });
          }
          return true;
        }

        // Check plain text paste size limit
        const text = event.clipboardData?.getData("text/plain");
        if (text && text.length > MAX_PASTE_TEXT_SIZE) {
          event.preventDefault();
          uiState.showStatus(`Paste too large (${formatSize(text.length)}). Maximum paste size is 5 MB.`);
          return true;
        }

        // Check for pasted image URL in text
        const trimmed = text?.trim();
        if (trimmed && /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(trimmed)) {
          event.preventDefault();
          const node = schema.nodes.image.create({ src: trimmed, alt: "" });
          const tr = view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr);
          return true;
        }

        return false;
      },
    },
  });
}

/** Get the directory of the current document, or null for untitled docs. */
function getDocDir(): string | null {
  const fp = documentState.filePath();
  if (!fp) return null;
  const idx = fp.lastIndexOf("/");
  return idx >= 0 ? fp.slice(0, idx) : null;
}

async function handleImageFile(file: File): Promise<string | null> {
  // Check image size before loading into memory
  if (file.size > MAX_IMAGE_SIZE) {
    uiState.showStatus(`Image too large (${formatSize(file.size)}). Maximum image size is 20 MB.`);
    return null;
  }

  try {
    const buffer = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buffer));
    const filename = file.name || `pasted-image-${Date.now()}.png`;

    // Save via Rust command — pass doc directory for relative path support
    const docDir = getDocDir();
    const savedPath = await invoke<string>("save_image", {
      filename,
      data,
      docDir,
    });
    return savedPath;
  } catch (err) {
    uiState.showStatus("Failed to save image");
    return null;
  }
}
