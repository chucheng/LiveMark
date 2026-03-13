import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../markdown/parser";
import { schema } from "../schema";
import { Node } from "prosemirror-model";

/**
 * Validate that a node conforms to its schema spec.
 * ProseMirror's schema.node() throws on invalid content,
 * but parseMarkdown might produce subtly invalid docs.
 */
function validateNode(node: Node): boolean {
  try {
    node.check();
    return true;
  } catch {
    return false;
  }
}

/**
 * Walk all nodes in a doc and verify each has valid content
 * according to the schema.
 */
function deepValidate(doc: Node): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  doc.descendants((node, pos) => {
    try {
      node.check();
    } catch (e: unknown) {
      errors.push(
        `Node ${node.type.name} at pos ${pos}: ${(e as Error).message}`
      );
    }
    return true;
  });
  return { valid: errors.length === 0, errors };
}

// --- Table Schema Tests ---

describe("Schema validation: tables", () => {
  it("SV1: parsed table has paragraph in cells", () => {
    const doc = parseMarkdown("| a |\n| --- |\n| b |");
    expect(doc).not.toBeNull();

    let foundCell = false;
    doc!.descendants((node) => {
      if (node.type.name === "table_cell" || node.type.name === "table_header") {
        foundCell = true;
        // Cell's first child must be paragraph
        expect(node.firstChild).not.toBeNull();
        expect(node.firstChild!.type.name).toBe("paragraph");
      }
      return true;
    });
    expect(foundCell).toBe(true);
  });

  it("table with multiple cells all have paragraphs", () => {
    const doc = parseMarkdown("| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |");
    expect(doc).not.toBeNull();

    let cellCount = 0;
    doc!.descendants((node) => {
      if (node.type.name === "table_cell" || node.type.name === "table_header") {
        cellCount++;
        expect(node.firstChild?.type.name).toBe("paragraph");
      }
      return true;
    });
    expect(cellCount).toBe(6); // 3 header + 3 body
  });

  it("empty table cell has empty paragraph", () => {
    const doc = parseMarkdown("| |\n| --- |\n| |");
    expect(doc).not.toBeNull();

    doc!.descendants((node) => {
      if (node.type.name === "table_cell" || node.type.name === "table_header") {
        expect(node.firstChild).not.toBeNull();
        expect(node.firstChild!.type.name).toBe("paragraph");
      }
      return true;
    });
  });

  it("parsed table is schema-valid", () => {
    const doc = parseMarkdown("| H1 | H2 |\n| --- | --- |\n| a | b |");
    expect(doc).not.toBeNull();
    const result = deepValidate(doc!);
    expect(result.valid).toBe(true);
  });
});

// --- List Schema Tests ---

describe("Schema validation: lists", () => {
  it("SV2: parsed list has paragraph in items", () => {
    const doc = parseMarkdown("- item 1\n- item 2");
    expect(doc).not.toBeNull();

    let itemCount = 0;
    doc!.descendants((node) => {
      if (node.type.name === "list_item") {
        itemCount++;
        expect(node.firstChild).not.toBeNull();
        expect(node.firstChild!.type.name).toBe("paragraph");
      }
      return true;
    });
    expect(itemCount).toBe(2);
  });

  it("nested list item has paragraph first child", () => {
    const doc = parseMarkdown("- parent\n  - child");
    expect(doc).not.toBeNull();

    doc!.descendants((node) => {
      if (node.type.name === "list_item") {
        expect(node.firstChild?.type.name).toBe("paragraph");
      }
      return true;
    });
  });

  it("ordered list items have paragraph first child", () => {
    const doc = parseMarkdown("1. first\n2. second");
    expect(doc).not.toBeNull();

    doc!.descendants((node) => {
      if (node.type.name === "list_item") {
        expect(node.firstChild?.type.name).toBe("paragraph");
      }
      return true;
    });
  });
});

// --- Empty Document ---

describe("Schema validation: empty/edge documents", () => {
  it("SV3: empty string creates valid doc", () => {
    const doc = parseMarkdown("");
    expect(doc).not.toBeNull();
    // Doc must have at least one block child
    expect(doc!.childCount).toBeGreaterThanOrEqual(1);
    const result = deepValidate(doc!);
    expect(result.valid).toBe(true);
  });

  it("whitespace-only creates valid doc", () => {
    const doc = parseMarkdown("   \n\n   ");
    expect(doc).not.toBeNull();
    const result = deepValidate(doc!);
    expect(result.valid).toBe(true);
  });

  it("createAndFill creates valid empty doc", () => {
    const doc = schema.topNodeType.createAndFill()!;
    expect(doc).not.toBeNull();
    const result = deepValidate(doc);
    expect(result.valid).toBe(true);
  });
});

// --- Task List ---

describe("Schema validation: task lists", () => {
  it("SV4: task list parsed correctly", () => {
    const doc = parseMarkdown("- [ ] task 1\n- [x] task 2");
    expect(doc).not.toBeNull();

    let taskListFound = false;
    let taskItemCount = 0;

    doc!.descendants((node) => {
      if (node.type.name === "task_list") {
        taskListFound = true;
      }
      if (node.type.name === "task_list_item") {
        taskItemCount++;
        expect(node.firstChild?.type.name).toBe("paragraph");
      }
      return true;
    });

    expect(taskListFound).toBe(true);
    expect(taskItemCount).toBe(2);
  });

  it("task list items have correct checked attribute", () => {
    const doc = parseMarkdown("- [ ] unchecked\n- [x] checked");
    expect(doc).not.toBeNull();

    const items: Array<{ checked: boolean; text: string }> = [];
    doc!.descendants((node) => {
      if (node.type.name === "task_list_item") {
        items.push({
          checked: node.attrs.checked,
          text: node.textContent,
        });
      }
      return true;
    });

    expect(items).toHaveLength(2);
    expect(items[0].checked).toBe(false);
    expect(items[0].text).toBe("unchecked");
    expect(items[1].checked).toBe(true);
    expect(items[1].text).toBe("checked");
  });
});

// --- Heading ---

describe("Schema validation: headings", () => {
  it("SV5: heading has correct level attribute", () => {
    for (let level = 1; level <= 6; level++) {
      const doc = parseMarkdown(`${"#".repeat(level)} Title`);
      expect(doc).not.toBeNull();

      let headingFound = false;
      doc!.descendants((node) => {
        if (node.type.name === "heading") {
          headingFound = true;
          expect(node.attrs.level).toBe(level);
        }
        return true;
      });
      expect(headingFound).toBe(true);
    }
  });
});

// --- Code Block ---

describe("Schema validation: code blocks", () => {
  it("SV6: code block preserves language attribute", () => {
    const doc = parseMarkdown("```python\nprint('hello')\n```");
    expect(doc).not.toBeNull();

    let codeBlockFound = false;
    doc!.descendants((node) => {
      if (node.type.name === "code_block") {
        codeBlockFound = true;
        expect(node.attrs.language).toBe("python");
      }
      return true;
    });
    expect(codeBlockFound).toBe(true);
  });

  it("code block without language has empty language", () => {
    const doc = parseMarkdown("```\ncode\n```");
    expect(doc).not.toBeNull();

    doc!.descendants((node) => {
      if (node.type.name === "code_block") {
        expect(node.attrs.language).toBe("");
      }
      return true;
    });
  });

  it("code block has no marks on content", () => {
    const doc = parseMarkdown("```\n**not bold** *not italic*\n```");
    expect(doc).not.toBeNull();

    doc!.descendants((node) => {
      if (node.type.name === "code_block") {
        node.forEach((child) => {
          expect(child.marks).toHaveLength(0);
        });
      }
      return true;
    });
  });
});

// --- Image ---

describe("Schema validation: images", () => {
  it("SV7: image preserves all attributes", () => {
    const doc = parseMarkdown('![alt text](https://example.com/img.png "A Title")');
    expect(doc).not.toBeNull();

    let imageFound = false;
    doc!.descendants((node) => {
      if (node.type.name === "image") {
        imageFound = true;
        expect(node.attrs.src).toBe("https://example.com/img.png");
        expect(node.attrs.alt).toBe("alt text");
        expect(node.attrs.title).toBe("A Title");
      }
      return true;
    });
    expect(imageFound).toBe(true);
  });

  it("image with no title has null title", () => {
    const doc = parseMarkdown("![alt](url)");
    expect(doc).not.toBeNull();

    doc!.descendants((node) => {
      if (node.type.name === "image") {
        expect(node.attrs.title).toBeNull();
      }
      return true;
    });
  });

  it("image with empty alt", () => {
    const doc = parseMarkdown("![](url)");
    expect(doc).not.toBeNull();

    doc!.descendants((node) => {
      if (node.type.name === "image") {
        expect(node.attrs.alt).toBeNull();
      }
      return true;
    });
  });
});

// --- Ordered List ---

describe("Schema validation: ordered lists", () => {
  it("SV8: ordered list preserves start number", () => {
    const doc = parseMarkdown("3. Third\n4. Fourth");
    expect(doc).not.toBeNull();

    let listFound = false;
    doc!.descendants((node) => {
      if (node.type.name === "ordered_list") {
        listFound = true;
        expect(node.attrs.start).toBe(3);
      }
      return true;
    });
    expect(listFound).toBe(true);
  });

  it("ordered list default start is 1", () => {
    const doc = parseMarkdown("1. First\n2. Second");
    expect(doc).not.toBeNull();

    doc!.descendants((node) => {
      if (node.type.name === "ordered_list") {
        expect(node.attrs.start).toBe(1);
      }
      return true;
    });
  });
});

// --- Full Document Validation ---

describe("Schema validation: complex documents", () => {
  it("complex document is fully schema-valid", () => {
    const md = `# Heading

Paragraph with **bold** and *italic*.

- List item 1
- List item 2

1. Ordered 1
2. Ordered 2

> Blockquote

\`\`\`js
code
\`\`\`

---

| A | B |
| --- | --- |
| 1 | 2 |

- [ ] Task
- [x] Done

![img](url "title")`;

    const doc = parseMarkdown(md);
    expect(doc).not.toBeNull();
    const result = deepValidate(doc!);
    if (!result.valid) {
      console.error("Schema validation errors:", result.errors);
    }
    expect(result.valid).toBe(true);
  });
});
