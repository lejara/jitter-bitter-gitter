/* eslint-disable @typescript-eslint/no-explicit-any */
//NOTE: to add imports you def should use a bundler
//Figma plugin UI runs in the browser environment

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

figma.ui.onmessage = (msg: { type: string }) => {
  if ("grab-data" === msg.type) {
    main();
  }
};

async function main() {
  const selection = figma.currentPage.selection;

  const textData: Record<
    string,
    {
      text: string;

      fontSize: number | symbol;
      fontName: FontName;
      svg: {
        data: string;
        path: string;
      };
      styles: Array<{
        char: string;
        fontName: FontName;
        fontSize: number;
        lineHeight: any;
        letterSpacing: any;
      }>;
    }
  > = {};

  if (selection.length === 0) {
    figma.notify("Select at least one text layer.");
    figma.closePlugin();
    return;
  }
  for (const node of selection) {
    await traverse(node, textData);
  }
  console.log("DONE!");

  figma.ui.postMessage({
    type: "TEXT_DATA",
    data: JSON.stringify(textData, null, 2),
  });
  // figma.closePlugin();
}

async function traverse(node: SceneNode, textData: any) {
  if (!isNodeVisible(node)) return;

  if ("children" in node) {
    for (const child of node.children) {
      await traverse(child, textData);
    }
  }

  if (node.type === "TEXT") {
    const svgString = await node.exportAsync({ format: "SVG_STRING" });
    const pathMatch = svgString.match(/<path[^>]*d="([^"]+)"/);

    if (!pathMatch) {
      console.warn(`No path found in SVG for node ${node.id}. Skipping.`);
      return;
    }

    await loadFonts(node);
    const chars = node.characters;
    const styles = [];
    for (let i = 0; i < chars.length; i++) {
      styles.push({
        char: chars[i],
        fontName: node.getRangeFontName(i, i + 1) as FontName,
        fontSize: node.getRangeFontSize(i, i + 1) as number,
        lineHeight: node.getRangeLineHeight(i, i + 1),
        letterSpacing: node.getRangeLetterSpacing(i, i + 1),
      });
    }
    textData[node.id] = {
      text: chars,
      fontSize: node.fontSize,
      fontName: node.fontName as FontName,
      styles,
      svg: {
        data: svgString,
        path: pathMatch[1],
      },
    };
  }
}

function isNodeVisible(node: SceneNode): boolean {
  // Must be visible itself
  if (!node.visible) return false;
  // Must have non-zero opacity
  if ("opacity" in node && node.opacity === 0) return false;

  // Must have render bounds > 0 (not clipped/out of view)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((node as any).absoluteRenderBounds == null) return false;

  // All parents up to the page must be visible
  let parent = node.parent;
  while (parent && parent.type !== "PAGE") {
    if ("visible" in parent && !parent.visible) return false;
    if ("opacity" in parent && parent.opacity === 0) return false;
    parent = parent.parent;
  }

  return true;
}

async function loadFonts(textNode: TextNode) {
  const fontPromises = new Set<string>();
  for (let i = 0; i < textNode.characters.length; i++) {
    const fontName = textNode.getRangeFontName(i, i + 1);
    fontPromises.add(JSON.stringify(fontName));
  }
  for (const fn of fontPromises) {
    await figma.loadFontAsync(JSON.parse(fn));
  }
}
