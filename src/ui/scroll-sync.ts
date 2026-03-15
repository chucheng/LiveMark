import { markdownSerializer } from "../editor/markdown/serializer";
import type { Node } from "prosemirror-model";

interface SyncEntry {
  pmPos: number;
  mdLine: number;
}

/**
 * Build a mapping from PM doc positions to markdown line numbers.
 * Each top-level block gets an entry with its start PM position
 * and the line number it starts at in the serialized markdown.
 */
export function buildSyncMap(doc: Node): SyncEntry[] {
  const map: SyncEntry[] = [];
  let mdLine = 0;
  const schema = doc.type.schema;

  doc.forEach((child, offset, index) => {
    map.push({ pmPos: offset, mdLine });
    try {
      const tempDoc = schema.node("doc", null, [child]);
      const blockMd = markdownSerializer.serialize(tempDoc).replace(/\n+$/, "");
      const blockLines = blockMd.split("\n").length;
      // Record end-of-block so interpolation stays within the block's line range
      // (without this, the blank line separator bleeds into the interpolation)
      const endPos = offset + child.nodeSize - 1;
      if (endPos > offset) {
        map.push({ pmPos: endPos, mdLine: mdLine + blockLines - 1 });
      }
      mdLine += blockLines;
    } catch {
      mdLine += 1;
    }
    if (index < doc.childCount - 1) mdLine += 1; // blank line separator
  });

  return map;
}

/**
 * PM position → fractional markdown line number (with interpolation).
 */
export function pmPosToMdLine(map: SyncEntry[], pos: number): number {
  if (map.length === 0) return 0;

  let idx = 0;
  for (let i = 1; i < map.length; i++) {
    if (map[i].pmPos <= pos) idx = i;
    else break;
  }

  const cur = map[idx];
  const next = map[idx + 1];
  if (!next) return cur.mdLine;

  const pmRange = next.pmPos - cur.pmPos;
  const fraction = pmRange > 0 ? (pos - cur.pmPos) / pmRange : 0;
  return cur.mdLine + fraction * (next.mdLine - cur.mdLine);
}

/**
 * Markdown line number → PM position (with interpolation).
 */
export function mdLineToPmPos(map: SyncEntry[], line: number, docSize: number): number {
  if (map.length === 0) return 0;

  let idx = 0;
  for (let i = 1; i < map.length; i++) {
    if (map[i].mdLine < line) idx = i;
    else break;
  }

  const cur = map[idx];
  const next = map[idx + 1];
  let targetPos = cur.pmPos;

  if (next) {
    const mdRange = next.mdLine - cur.mdLine;
    const fraction = mdRange > 0 ? (line - cur.mdLine) / mdRange : 0;
    targetPos = cur.pmPos + Math.round(fraction * (next.pmPos - cur.pmPos));
  }

  return Math.max(0, Math.min(targetPos, docSize));
}
