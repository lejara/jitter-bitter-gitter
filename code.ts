// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.

const textData: { [key: string]: { text: string; svg: string } } = {};

figma.ui.onmessage = (msg: { type: string; count: number }) => {
  console.log("Received message from UI:", msg);

  main();
};

async function traverse(node: SceneNode) {
  if (!isNodeVisible(node)) return;

  if ("children" in node) {
    for (const child of node.children) {
      await traverse(child);
    }
  }

  if (node.type === "TEXT") {
    const svgString = await node.exportAsync({ format: "SVG_STRING" });

    // Save both text and SVG to textData
    textData[node.id] = {
      text: node.characters,
      svg: svgString,
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

async function main() {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.notify("Select at least one text layer.");
    figma.closePlugin();
    return;
  }
  for (const node of selection) {
    await traverse(node);
  }
  console.log("Text + SVG Data:", textData);
  figma.ui.postMessage({ type: "TEXT_DATA", data: textData });
  figma.closePlugin();
}
