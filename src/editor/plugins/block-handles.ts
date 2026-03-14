import { Plugin, PluginKey, EditorState, Transaction, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";

const blockHandlesKey = new PluginKey("blockHandles");

interface BlockHandlesState {
  hoveredPos: number | null;
  menuPos: number | null;
  /** Drag-and-drop state */
  dragSourcePos: number | null;
  dropTargetPos: number | null;
  // plusClick is communicated via custom DOM event "lm-plus-click" — not stored in state
}

// ── Helpers ──────────────────────────────────────────────────────

function topLevelBlockAtCoords(view: EditorView, y: number): number | null {
  const doc = view.state.doc;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    const pos = posOfChild(doc, i);
    try {
      const start = view.coordsAtPos(pos + 1);
      const end = view.coordsAtPos(pos + child.nodeSize - 1);
      if (y >= start.top - 4 && y <= end.bottom + 4) {
        return pos;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function posOfChild(doc: Node, index: number): number {
  let pos = 0;
  for (let i = 0; i < index; i++) {
    pos += doc.child(i).nodeSize;
  }
  return pos;
}

function indexOfPos(doc: Node, pos: number): number {
  let offset = 0;
  for (let i = 0; i < doc.childCount; i++) {
    if (offset === pos) return i;
    offset += doc.child(i).nodeSize;
  }
  return -1;
}

/**
 * Find the nearest block boundary position from mouse Y.
 * Returns the position *before* the block that the indicator should appear above.
 */
function nearestBlockBoundary(view: EditorView, mouseY: number): number | null {
  const doc = view.state.doc;
  let closest: number | null = null;
  let closestDist = Infinity;

  for (let i = 0; i <= doc.childCount; i++) {
    let boundaryY: number;
    try {
      if (i === 0) {
        const pos = posOfChild(doc, 0);
        boundaryY = view.coordsAtPos(pos + 1).top;
      } else if (i === doc.childCount) {
        const prevChild = doc.child(i - 1);
        const prevPos = posOfChild(doc, i - 1);
        boundaryY = view.coordsAtPos(prevPos + prevChild.nodeSize - 1).bottom;
      } else {
        const pos = posOfChild(doc, i);
        const prevChild = doc.child(i - 1);
        const prevPos = posOfChild(doc, i - 1);
        const prevBottom = view.coordsAtPos(prevPos + prevChild.nodeSize - 1).bottom;
        const curTop = view.coordsAtPos(pos + 1).top;
        boundaryY = (prevBottom + curTop) / 2;
      }
    } catch {
      continue;
    }

    const dist = Math.abs(mouseY - boundaryY);
    if (dist < closestDist) {
      closestDist = dist;
      closest = i < doc.childCount ? posOfChild(doc, i) : posOfChild(doc, i - 1) + doc.child(i - 1).nodeSize;
    }
  }
  return closest;
}

// ── SVG icons ────────────────────────────────────────────────────

const PLUS_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const GRIP_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="6" cy="4" r="1.2" fill="currentColor"/>
  <circle cx="10" cy="4" r="1.2" fill="currentColor"/>
  <circle cx="6" cy="8" r="1.2" fill="currentColor"/>
  <circle cx="10" cy="8" r="1.2" fill="currentColor"/>
  <circle cx="6" cy="12" r="1.2" fill="currentColor"/>
  <circle cx="10" cy="12" r="1.2" fill="currentColor"/>
</svg>`;

// ── Slug / Block ID helpers ──────────────────────────────────────

/**
 * Generate a URL-friendly slug from heading text content.
 * Lowercases, replaces spaces with hyphens, strips non-alphanumeric chars.
 * Falls back to a random ID if the result would be empty.
 */
function generateSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `heading-${generateBlockId()}`;
}

/**
 * Generate a short random block ID (8 hex chars).
 */
function generateBlockId(): string {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Read-only: get the anchor for a block without mutating state.
 * Returns null for non-heading blocks that have no blockId yet.
 */
function readBlockAnchor(
  view: EditorView,
  blockPos: number
): string | null {
  const node = view.state.doc.nodeAt(blockPos);
  if (!node) return null;

  if (node.type.name === "heading") {
    const baseSlug = generateSlug(node.textContent);
    let count = 0;
    view.state.doc.forEach((child, offset) => {
      if (offset >= blockPos) return;
      if (child.type.name === "heading" && generateSlug(child.textContent) === baseSlug) {
        count++;
      }
    });
    return count > 0 ? `${baseSlug}-${count}` : baseSlug;
  }

  return node.attrs.blockId ?? null;
}

/**
 * Get or generate a link anchor for the block at the given position.
 * - Headings: slug from text content (read-only)
 * - Other blocks: read existing blockId attr, or generate + persist one via transaction
 * Returns the anchor string (without leading #).
 */
export function getBlockAnchor(
  view: EditorView,
  blockPos: number
): string | null {
  const existing = readBlockAnchor(view, blockPos);
  if (existing) return existing;

  // Non-heading block without an ID — generate and persist
  const node = view.state.doc.nodeAt(blockPos);
  if (!node) return null;

  const id = generateBlockId();
  const tr = view.state.tr.setNodeMarkup(blockPos, undefined, {
    ...node.attrs,
    blockId: id,
  });
  view.dispatch(tr);
  return id;
}

// ── Block commands (unchanged) ───────────────────────────────────

function getActiveBlockPos(state: EditorState): number | null {
  const { $head } = state.selection;
  if ($head.depth < 1) return null;
  return $head.before(1);
}

export function moveBlockUp(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const pos = getActiveBlockPos(state);
  if (pos === null) return false;
  const doc = state.doc;
  const idx = indexOfPos(doc, pos);
  if (idx <= 0) return false;

  if (dispatch) {
    const node = doc.child(idx);
    const prevNode = doc.child(idx - 1);
    const tr = state.tr;
    tr.delete(pos, pos + node.nodeSize);
    const insertPos = pos - prevNode.nodeSize;
    tr.insert(insertPos, node);
    tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

export function moveBlockDown(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const pos = getActiveBlockPos(state);
  if (pos === null) return false;
  const doc = state.doc;
  const idx = indexOfPos(doc, pos);
  if (idx < 0 || idx >= doc.childCount - 1) return false;

  if (dispatch) {
    const node = doc.child(idx);
    const nextNode = doc.child(idx + 1);
    const tr = state.tr;
    tr.delete(pos, pos + node.nodeSize);
    const insertPos = pos + nextNode.nodeSize;
    const mappedPos = tr.mapping.map(insertPos);
    tr.insert(mappedPos, node);
    tr.setSelection(TextSelection.near(tr.doc.resolve(mappedPos + 1)));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

export function duplicateBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const pos = getActiveBlockPos(state);
  if (pos === null) return false;
  const doc = state.doc;
  const idx = indexOfPos(doc, pos);
  if (idx < 0) return false;

  if (dispatch) {
    const node = doc.child(idx);
    const afterPos = pos + node.nodeSize;
    const tr = state.tr;
    tr.insert(afterPos, node.copy(node.content));
    tr.setSelection(TextSelection.near(tr.doc.resolve(afterPos + 1)));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

export function deleteBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const pos = getActiveBlockPos(state);
  if (pos === null) return false;
  const doc = state.doc;
  const idx = indexOfPos(doc, pos);
  if (idx < 0) return false;
  if (doc.childCount <= 1) return false;

  if (dispatch) {
    const node = doc.child(idx);
    const tr = state.tr;
    tr.delete(pos, pos + node.nodeSize);
    const target = Math.min(pos, tr.doc.content.size - 1);
    if (target > 0) {
      tr.setSelection(TextSelection.near(tr.doc.resolve(target)));
    }
    dispatch(tr.scrollIntoView());
  }
  return true;
}

// ── Plugin ───────────────────────────────────────────────────────

export function blockHandlesPlugin(): Plugin<BlockHandlesState> {
  let throttleTimer: ReturnType<typeof setTimeout> | null = null;
  let dragThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  let autoScrollRAF: number | null = null;
  let lastDragClientY = 0;
  let dragSourceElement: HTMLElement | null = null;

  function startAutoScroll(view: EditorView) {
    if (autoScrollRAF !== null) return;
    const EDGE_ZONE = 60;
    const MAX_SPEED = 12;

    function tick() {
      const editorRect = view.dom.getBoundingClientRect();
      const y = lastDragClientY;
      let speed = 0;

      if (y < editorRect.top + EDGE_ZONE) {
        // Near top — scroll up
        const dist = Math.max(0, y - editorRect.top);
        speed = -MAX_SPEED * (1 - dist / EDGE_ZONE);
      } else if (y > editorRect.bottom - EDGE_ZONE) {
        // Near bottom — scroll down
        const dist = Math.max(0, editorRect.bottom - y);
        speed = MAX_SPEED * (1 - dist / EDGE_ZONE);
      }

      if (speed !== 0) {
        view.dom.scrollTop += speed;
      }

      autoScrollRAF = requestAnimationFrame(tick);
    }
    autoScrollRAF = requestAnimationFrame(tick);
  }

  function stopAutoScroll() {
    if (autoScrollRAF !== null) {
      cancelAnimationFrame(autoScrollRAF);
      autoScrollRAF = null;
    }
  }

  function cleanupDrag() {
    stopAutoScroll();
    document.body.classList.remove("lm-dragging");
    if (dragSourceElement) {
      dragSourceElement.classList.remove("lm-drag-source");
      dragSourceElement = null;
    }
  }

  return new Plugin<BlockHandlesState>({
    key: blockHandlesKey,
    state: {
      init(): BlockHandlesState {
        return { hoveredPos: null, menuPos: null, dragSourcePos: null, dropTargetPos: null };
      },
      apply(tr, value): BlockHandlesState {
        const meta = tr.getMeta(blockHandlesKey);
        if (meta) return { ...value, ...meta };
        if (tr.docChanged) {
          let next = { ...value };
          if (value.hoveredPos !== null) {
            next.hoveredPos = tr.mapping.map(value.hoveredPos);
          }
          if (value.dragSourcePos !== null) {
            next.dragSourcePos = tr.mapping.map(value.dragSourcePos);
          }
          if (value.dropTargetPos !== null) {
            next.dropTargetPos = tr.mapping.map(value.dropTargetPos);
          }
          return next;
        }
        return value;
      },
    },
    props: {
      decorations(state) {
        const pluginState = blockHandlesKey.getState(state);
        if (!pluginState) return DecorationSet.empty;

        const decos: Decoration[] = [];

        // Handle gutter for hovered block
        if (pluginState.hoveredPos !== null) {
          const pos = pluginState.hoveredPos;
          if (pos >= 0 && pos < state.doc.content.size) {
            const widget = Decoration.widget(pos, (view) => {
              const gutter = document.createElement("div");
              gutter.className = "lm-block-gutter";
              gutter.dataset.blockPos = String(pos);

              // Vertically align gutter with the block's first line of text
              try {
                const coords = view.coordsAtPos(pos + 1);
                const editorRect = view.dom.getBoundingClientRect();
                const lineCenter = (coords.top + coords.bottom) / 2;
                const gutterHeight = 22; // matches button height
                gutter.style.top = `${lineCenter - editorRect.top - gutterHeight / 2}px`;
              } catch {
                // fallback: auto position from DOM flow
              }

              // Plus button
              const plus = document.createElement("button");
              plus.className = "lm-block-plus";
              plus.innerHTML = PLUS_SVG;
              plus.title = "Add block";
              plus.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = plus.getBoundingClientRect();
                // Dispatch custom event for BlockTypePicker (avoids polling)
                view.dom.dispatchEvent(new CustomEvent("lm-plus-click", {
                  bubbles: true,
                  detail: { blockPos: pos, rect },
                }));
              });

              // Grip handle
              const grip = document.createElement("div");
              grip.className = "lm-block-grip";
              grip.innerHTML = GRIP_SVG;
              grip.setAttribute("draggable", "true");
              grip.dataset.blockPos = String(pos);
              grip.title = "Drag to move, click for options";

              // Drag start
              grip.addEventListener("dragstart", (e) => {
                if (!e.dataTransfer) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", "");

                // Create drag image from the block DOM
                try {
                  const blockDOM = view.nodeDOM(pos) as HTMLElement | null;
                  if (blockDOM) {
                    const clone = blockDOM.cloneNode(true) as HTMLElement;
                    clone.style.width = Math.min(blockDOM.offsetWidth, 600) + "px";
                    clone.style.maxWidth = "600px";
                    clone.style.opacity = "0.6";
                    clone.style.position = "absolute";
                    clone.style.top = "-9999px";
                    clone.style.pointerEvents = "none";
                    document.body.appendChild(clone);
                    e.dataTransfer.setDragImage(clone, 0, 0);
                    // Delay removal to ensure browser captures the image
                    setTimeout(() => clone.remove(), 100);

                    // Ghost the source block
                    blockDOM.classList.add("lm-drag-source");
                    dragSourceElement = blockDOM;
                  }
                } catch {
                  // fall through — default drag image
                }

                // Global grabbing cursor + prevent text selection
                document.body.classList.add("lm-dragging");
                view.dom.classList.add("lm-no-select");

                // Start auto-scroll loop
                startAutoScroll(view);

                view.dispatch(view.state.tr.setMeta(blockHandlesKey, {
                  dragSourcePos: pos,
                  dropTargetPos: null,
                }));
              });

              gutter.appendChild(plus);
              gutter.appendChild(grip);
              return gutter;
            }, { side: -1, key: `gutter-${pos}` });

            decos.push(widget);
          }
        }

        // Drop indicator
        if (pluginState.dropTargetPos !== null) {
          const dropPos = pluginState.dropTargetPos;
          if (dropPos >= 0 && dropPos <= state.doc.content.size) {
            const indicator = Decoration.widget(dropPos, () => {
              const el = document.createElement("div");
              el.className = "lm-drop-indicator";
              return el;
            }, { side: -1, key: `drop-${dropPos}` });
            decos.push(indicator);
          }
        }

        return decos.length > 0 ? DecorationSet.create(state.doc, decos) : DecorationSet.empty;
      },

      handleDOMEvents: {
        mousemove(view, event) {
          if (throttleTimer) return false;
          throttleTimer = setTimeout(() => { throttleTimer = null; }, 60);

          const currentState = blockHandlesKey.getState(view.state);
          const pos = topLevelBlockAtCoords(view, event.clientY);

          if (pos !== currentState?.hoveredPos) {
            // Show handles on ALL blocks — no active-block restriction
            view.dispatch(view.state.tr.setMeta(blockHandlesKey, { hoveredPos: pos }));
          }
          return false;
        },

        mouseleave(view) {
          const currentState = blockHandlesKey.getState(view.state);
          if (currentState?.hoveredPos != null && currentState?.dragSourcePos == null) {
            view.dispatch(view.state.tr.setMeta(blockHandlesKey, { hoveredPos: null }));
          }
          return false;
        },

        dragover(view, event) {
          const currentState = blockHandlesKey.getState(view.state);
          if (currentState?.dragSourcePos == null) return false;

          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
          }

          // Track cursor Y for auto-scroll
          lastDragClientY = event.clientY;

          // Throttle boundary computation — dragover fires every ~16ms
          if (dragThrottleTimer) return false;
          dragThrottleTimer = setTimeout(() => { dragThrottleTimer = null; }, 40);

          const dropPos = nearestBlockBoundary(view, event.clientY);
          if (dropPos !== null && dropPos !== currentState.dropTargetPos) {
            // Skip indicator at same position as source (would be a no-op drop)
            const sourcePos = currentState.dragSourcePos!;
            const sourceNode = view.state.doc.nodeAt(sourcePos);
            if (sourceNode && (dropPos === sourcePos || dropPos === sourcePos + sourceNode.nodeSize)) {
              // Clear indicator if it was showing
              if (currentState.dropTargetPos !== null) {
                view.dispatch(view.state.tr.setMeta(blockHandlesKey, { dropTargetPos: null }));
              }
            } else {
              view.dispatch(view.state.tr.setMeta(blockHandlesKey, { dropTargetPos: dropPos }));
            }
          }
          return false;
        },

        drop(view, event) {
          const currentState = blockHandlesKey.getState(view.state);
          if (currentState?.dragSourcePos == null || currentState?.dropTargetPos == null) {
            cleanupDrag();
            view.dom.classList.remove("lm-no-select");
            return false;
          }

          event.preventDefault();
          cleanupDrag();
          view.dom.classList.remove("lm-no-select");
          const sourcePos = currentState.dragSourcePos;
          const targetPos = currentState.dropTargetPos;

          // Find source block — validate positions are within doc bounds
          const doc = view.state.doc;
          if (sourcePos < 0 || sourcePos >= doc.content.size || targetPos < 0 || targetPos > doc.content.size) {
            view.dispatch(view.state.tr.setMeta(blockHandlesKey, {
              dragSourcePos: null, dropTargetPos: null, hoveredPos: null,
            }));
            return false;
          }
          // Validate that sourcePos is at a valid block boundary
          const srcIdx = indexOfPos(doc, sourcePos);
          if (srcIdx < 0) {
            // Clear drag state on failure
            view.dispatch(view.state.tr.setMeta(blockHandlesKey, {
              dragSourcePos: null, dropTargetPos: null, hoveredPos: null,
            }));
            return false;
          }

          const node = doc.child(srcIdx);
          const srcEnd = sourcePos + node.nodeSize;

          // Validate that targetPos is at a valid block boundary
          const targetIdx = indexOfPos(doc, targetPos);
          // targetPos must either be a block start or the end of the last block
          if (targetIdx < 0 && targetPos !== doc.content.size) {
            view.dispatch(view.state.tr.setMeta(blockHandlesKey, {
              dragSourcePos: null, dropTargetPos: null, hoveredPos: null,
            }));
            return false;
          }

          // Skip if dropping at same position — just clear state
          if (targetPos === sourcePos || targetPos === srcEnd) {
            view.dispatch(view.state.tr.setMeta(blockHandlesKey, {
              dragSourcePos: null, dropTargetPos: null, hoveredPos: null,
            }));
            return true;
          }

          // Single transaction: clear drag state + move block
          const tr = view.state.tr;
          tr.setMeta(blockHandlesKey, {
            dragSourcePos: null, dropTargetPos: null, hoveredPos: null,
          });

          if (targetPos < sourcePos) {
            // Moving up: insert first, then delete
            tr.insert(targetPos, node);
            const newSrcPos = tr.mapping.map(sourcePos);
            tr.delete(newSrcPos, newSrcPos + node.nodeSize);
            tr.setSelection(TextSelection.near(tr.doc.resolve(targetPos + 1)));
          } else {
            // Moving down: delete first, then insert
            tr.delete(sourcePos, srcEnd);
            const mappedTarget = tr.mapping.map(targetPos);
            tr.insert(mappedTarget, node);
            tr.setSelection(TextSelection.near(tr.doc.resolve(mappedTarget + 1)));
          }

          view.dispatch(tr.scrollIntoView());
          return true;
        },

        dragend(view) {
          cleanupDrag();
          view.dom.classList.remove("lm-no-select");
          const currentState = blockHandlesKey.getState(view.state);
          if (currentState?.dragSourcePos != null || currentState?.dropTargetPos != null) {
            view.dispatch(view.state.tr.setMeta(blockHandlesKey, {
              dragSourcePos: null,
              dropTargetPos: null,
            }));
          }
          return false;
        },
      },
    },
  });
}
