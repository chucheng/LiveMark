import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * Lazy rendering plugin for large files.
 * Uses IntersectionObserver to only render NodeViews that are visible in the viewport.
 * Off-screen blocks get a minimal placeholder height to maintain scroll position.
 *
 * Threshold: only activates when document has > 500 blocks.
 */
const BLOCK_THRESHOLD = 500;
const lazyRenderKey = new PluginKey("lazyRender");

export function lazyRenderPlugin(): Plugin {
  let observer: IntersectionObserver | null = null;
  const visibleBlocks = new Set<number>();

  return new Plugin({
    key: lazyRenderKey,

    view(editorView) {
      const doc = editorView.state.doc;
      if (doc.childCount < BLOCK_THRESHOLD) return {};

      let alive = true;

      observer = new IntersectionObserver(
        (entries) => {
          if (!alive || !editorView.dom.isConnected) return;
          let changed = false;
          for (const entry of entries) {
            const pos = parseInt(
              (entry.target as HTMLElement).dataset.lazyPos || "-1"
            );
            if (pos < 0) continue;

            if (entry.isIntersecting) {
              if (!visibleBlocks.has(pos)) {
                visibleBlocks.add(pos);
                changed = true;
              }
            } else {
              if (visibleBlocks.has(pos)) {
                visibleBlocks.delete(pos);
                changed = true;
              }
            }
          }
          if (changed) {
            // Force decoration update
            editorView.dispatch(editorView.state.tr.setMeta(lazyRenderKey, true));
          }
        },
        {
          root: editorView.dom.closest(".lm-editor-wrapper"),
          rootMargin: "200px 0px",
        }
      );

      // Observe all top-level block nodes
      function observeBlocks() {
        if (!observer) return;
        const dom = editorView.dom;
        for (const child of Array.from(dom.children)) {
          observer.observe(child as Element);
        }
      }

      // Initial observation
      requestAnimationFrame(observeBlocks);

      return {
        update() {
          if (!observer) return;
          // Re-observe on doc changes
          if (editorView.state.doc.childCount >= BLOCK_THRESHOLD) {
            observer.disconnect();
            requestAnimationFrame(observeBlocks);
          }
        },
        destroy() {
          alive = false;
          observer?.disconnect();
          observer = null;
          visibleBlocks.clear();
        },
      };
    },

    props: {
      decorations(state) {
        if (state.doc.childCount < BLOCK_THRESHOLD) return DecorationSet.empty;

        const decos: Decoration[] = [];
        state.doc.forEach((node, pos) => {
          // Add data attribute for position tracking
          decos.push(
            Decoration.node(pos, pos + node.nodeSize, {
              "data-lazy-pos": String(pos),
            })
          );

          // If block is not visible, collapse it
          if (!visibleBlocks.has(pos)) {
            decos.push(
              Decoration.node(pos, pos + node.nodeSize, {
                class: "lm-lazy-hidden",
                style: "min-height: 1.5em; overflow: hidden; max-height: 1.5em;",
              })
            );
          }
        });

        return DecorationSet.create(state.doc, decos);
      },
    },
  });
}
