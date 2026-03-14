import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  ExternalHyperlink,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  ShadingType,
  convertInchesToTwip,
  TableLayoutType,
} from "docx";
import type { Node, Mark } from "prosemirror-model";
import { invoke } from "@tauri-apps/api/core";

const MONOSPACE_FONT = "Courier New";
const BODY_FONT = "Calibri";
const CODE_SHADING = { type: ShadingType.SOLID, color: "f0f0f0", fill: "f0f0f0" } as const;

// Map heading level (1-6) to docx HeadingLevel
const HEADING_LEVELS: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

/**
 * Generate a DOCX Uint8Array from a ProseMirror document.
 */
export async function generateDOCX(
  doc: Node,
  title: string,
  docDir?: string,
): Promise<Uint8Array> {
  const children = await convertChildren(doc, docDir);

  const document = new Document({
    title,
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: 24 }, // 12pt
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "ordered-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
            },
          ],
        },
        {
          reference: "bullet-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  return new Uint8Array(buffer);
}

/**
 * Convert all children of a PM node into docx elements.
 */
async function convertChildren(
  parent: Node,
  docDir?: string,
): Promise<(Paragraph | Table)[]> {
  const results: (Paragraph | Table)[] = [];
  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    const converted = await convertNode(child, docDir);
    results.push(...converted);
  }
  return results;
}

/**
 * Convert a single PM node into one or more docx elements.
 */
async function convertNode(
  node: Node,
  docDir?: string,
): Promise<(Paragraph | Table)[]> {
  switch (node.type.name) {
    case "frontmatter":
      return []; // Skip YAML frontmatter

    case "paragraph":
      return [new Paragraph({ children: convertInlineContent(node) })];

    case "heading": {
      const level = node.attrs.level as number;
      return [
        new Paragraph({
          heading: HEADING_LEVELS[level] ?? HeadingLevel.HEADING_1,
          children: convertInlineContent(node),
        }),
      ];
    }

    case "blockquote": {
      // Convert blockquote children inline with indent + border
      return convertBlockquote(node, docDir);
    }

    case "code_block": {
      const text = node.textContent;
      const lines = text.split("\n");
      return lines.map(
        (line) =>
          new Paragraph({
            children: [
              new TextRun({
                text: line || " ", // empty lines need a space to preserve
                font: MONOSPACE_FONT,
                size: 20, // 10pt
              }),
            ],
            shading: CODE_SHADING,
            spacing: { before: 0, after: 0, line: 276 },
          }),
      );
    }

    case "math_block": {
      // Render math as TeX source in monospace italic as fallback
      const tex = node.textContent;
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: tex,
              font: MONOSPACE_FONT,
              italics: true,
              size: 22,
            }),
          ],
          spacing: { before: 120, after: 120 },
        }),
      ];
    }

    case "horizontal_rule":
      return [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc", space: 4 } },
          spacing: { before: 200, after: 200 },
        }),
      ];

    case "bullet_list":
      return convertList(node, "bullet-list", docDir);

    case "ordered_list":
      return convertList(node, "ordered-list", docDir);

    case "task_list":
      return convertTaskList(node, docDir);

    case "list_item":
      // Should be handled by convertList, but handle standalone
      return convertChildren(node, docDir);

    case "task_list_item":
      // Should be handled by convertTaskList
      return convertChildren(node, docDir);

    case "table":
      return [await convertTable(node, docDir)];

    case "image":
      return convertImageNode(node, docDir);

    default:
      // For any unknown node with content, try to convert children
      if (node.content.size > 0) {
        return convertChildren(node, docDir);
      }
      return [];
  }
}

/**
 * Convert inline content of a PM node to TextRun/ExternalHyperlink children.
 */
function convertInlineContent(
  node: Node,
): (TextRun | ExternalHyperlink | ImageRun)[] {
  const runs: (TextRun | ExternalHyperlink | ImageRun)[] = [];

  node.forEach((child) => {
    if (child.isText) {
      const textRunOptions = marksToRunOptions(child.marks);
      const linkMark = child.marks.find((m) => m.type.name === "link");

      if (linkMark) {
        runs.push(
          new ExternalHyperlink({
            link: linkMark.attrs.href,
            children: [
              new TextRun({
                text: child.text ?? "",
                ...textRunOptions,
                style: "Hyperlink",
              }),
            ],
          }),
        );
      } else {
        runs.push(
          new TextRun({
            text: child.text ?? "",
            ...textRunOptions,
          }),
        );
      }
    } else if (child.type.name === "hard_break") {
      runs.push(new TextRun({ break: 1 }));
    } else if (child.type.name === "math_inline") {
      // Inline math: render as italic TeX source
      runs.push(
        new TextRun({
          text: child.attrs.tex,
          font: MONOSPACE_FONT,
          italics: true,
          size: 22,
        }),
      );
    } else if (child.type.name === "image") {
      // Inline images are handled async elsewhere; skip in sync context
      runs.push(new TextRun({ text: `[image: ${child.attrs.alt || child.attrs.src}]` }));
    }
  });

  return runs;
}

/**
 * Convert PM marks to TextRun formatting options.
 */
function marksToRunOptions(marks: readonly Mark[]): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  for (const mark of marks) {
    switch (mark.type.name) {
      case "strong":
        options.bold = true;
        break;
      case "em":
        options.italics = true;
        break;
      case "code":
        options.font = MONOSPACE_FONT;
        options.shading = CODE_SHADING;
        break;
      case "strikethrough":
        options.strike = true;
        break;
      // link is handled separately in convertInlineContent
    }
  }
  return options;
}

/**
 * Convert a bullet_list or ordered_list node to paragraphs with numbering.
 */
async function convertList(
  listNode: Node,
  reference: string,
  docDir?: string,
): Promise<Paragraph[]> {
  const results: Paragraph[] = [];

  for (let i = 0; i < listNode.childCount; i++) {
    const item = listNode.child(i);
    // First child of list_item is typically a paragraph
    for (let j = 0; j < item.childCount; j++) {
      const child = item.child(j);
      if (child.type.name === "paragraph" && j === 0) {
        results.push(
          new Paragraph({
            children: convertInlineContent(child),
            numbering: { reference, level: 0 },
          }),
        );
      } else {
        // Subsequent blocks in the list item — convert and indent
        const converted = await convertNode(child, docDir);
        for (const el of converted) {
          if (el instanceof Paragraph) {
            results.push(el);
          }
        }
      }
    }
  }

  return results;
}

/**
 * Convert a task_list to paragraphs with checkbox prefix.
 */
async function convertTaskList(
  listNode: Node,
  docDir?: string,
): Promise<Paragraph[]> {
  const results: Paragraph[] = [];

  for (let i = 0; i < listNode.childCount; i++) {
    const item = listNode.child(i);
    const checked = item.attrs.checked as boolean;
    const prefix = checked ? "\u2611 " : "\u2610 ";

    for (let j = 0; j < item.childCount; j++) {
      const child = item.child(j);
      if (child.type.name === "paragraph" && j === 0) {
        const inlineChildren = convertInlineContent(child);
        results.push(
          new Paragraph({
            children: [
              new TextRun({ text: prefix }),
              ...inlineChildren,
            ],
            indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
          }),
        );
      } else {
        const converted = await convertNode(child, docDir);
        for (const el of converted) {
          if (el instanceof Paragraph) {
            results.push(el);
          }
        }
      }
    }
  }

  return results;
}

/**
 * Convert a table node to a docx Table.
 */
async function convertTable(
  tableNode: Node,
  docDir?: string,
): Promise<Table> {
  const rows: TableRow[] = [];

  for (let i = 0; i < tableNode.childCount; i++) {
    const rowNode = tableNode.child(i);
    const cells: TableCell[] = [];

    for (let j = 0; j < rowNode.childCount; j++) {
      const cellNode = rowNode.child(j);
      const isHeader = cellNode.type.name === "table_header";
      const cellChildren = await convertChildren(cellNode, docDir);

      // Ensure at least one paragraph in the cell
      const children = cellChildren.length > 0
        ? cellChildren.filter((c): c is Paragraph => c instanceof Paragraph)
        : [new Paragraph({})];

      cells.push(
        new TableCell({
          children,
          width: { size: 0, type: WidthType.AUTO },
          shading: isHeader
            ? { type: ShadingType.SOLID, color: "f2f2f2", fill: "f2f2f2" }
            : undefined,
        }),
      );
    }

    rows.push(new TableRow({ children: cells }));
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
  });
}

/**
 * Convert an image node to a paragraph with an ImageRun.
 * Falls back to a text placeholder if the image can't be read.
 */
async function convertImageNode(
  node: Node,
  docDir?: string,
): Promise<Paragraph[]> {
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) || "";

  try {
    const imageData = await readImageBytes(src, docDir);
    if (imageData) {
      const { data, width, height } = imageData;
      // Scale to fit within 6 inches wide, maintaining aspect ratio
      const maxWidth = 600; // pixels at 100 DPI
      const scale = width > maxWidth ? maxWidth / width : 1;
      const scaledWidth = Math.round(width * scale);
      const scaledHeight = Math.round(height * scale);

      return [
        new Paragraph({
          children: [
            new ImageRun({
              data,
              transformation: { width: scaledWidth, height: scaledHeight },
              type: "png",
            }),
          ],
        }),
      ];
    }
  } catch {
    // Fall through to text fallback
  }

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `[Image: ${alt || src}]`,
          italics: true,
          color: "888888",
        }),
      ],
    }),
  ];
}

/**
 * Read image bytes from a local file path. Returns null if not readable.
 */
async function readImageBytes(
  src: string,
  docDir?: string,
): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  // Only handle local file paths, not URLs
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return null;
  }

  let filePath = src;
  // Resolve relative paths against document directory
  if (docDir && !src.startsWith("/")) {
    filePath = `${docDir}/${src}`;
  }

  try {
    const bytes = await invoke<number[]>("read_file_binary", { path: filePath });
    const data = new Uint8Array(bytes);

    // Get image dimensions from the binary data
    const dimensions = getImageDimensions(data);

    return { data, ...dimensions };
  } catch {
    return null;
  }
}

/**
 * Parse basic image dimensions from PNG/JPEG headers.
 * Returns a default if format is unrecognized.
 */
function getImageDimensions(data: Uint8Array): { width: number; height: number } {
  const DEFAULT = { width: 400, height: 300 };

  if (data.length < 24) return DEFAULT;

  // PNG: bytes 16-23 contain width and height as 4-byte big-endian
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
    const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
    if (width > 0 && height > 0) return { width, height };
    return DEFAULT;
  }

  // JPEG: scan for SOF0 marker (0xFF 0xC0) to find dimensions
  if (data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset < data.length - 9) {
      if (data[offset] === 0xff) {
        const marker = data[offset + 1];
        if (marker >= 0xc0 && marker <= 0xc3) {
          const height = (data[offset + 5] << 8) | data[offset + 6];
          const width = (data[offset + 7] << 8) | data[offset + 8];
          if (width > 0 && height > 0) return { width, height };
          return DEFAULT;
        }
        const segLen = (data[offset + 2] << 8) | data[offset + 3];
        offset += 2 + segLen;
      } else {
        offset++;
      }
    }
  }

  return DEFAULT;
}

/**
 * Convert blockquote: re-create children with indent and left border.
 */
async function convertBlockquote(
  node: Node,
  docDir?: string,
): Promise<(Paragraph | Table)[]> {
  const results: (Paragraph | Table)[] = [];
  const bqBorder = {
    left: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 8 },
  };
  const bqIndent = { left: convertInchesToTwip(0.5) };

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child.type.name === "paragraph") {
      results.push(
        new Paragraph({
          children: convertInlineContent(child),
          indent: bqIndent,
          border: bqBorder,
        }),
      );
    } else if (child.type.name === "blockquote") {
      // Nested blockquote — recurse with deeper indent
      const nested = await convertBlockquote(child, docDir);
      results.push(...nested);
    } else {
      const converted = await convertNode(child, docDir);
      results.push(...converted);
    }
  }

  return results;
}
