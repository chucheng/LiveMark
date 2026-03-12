import { createSignal } from "solid-js";

const [filePath, setFilePath] = createSignal<string | null>(null);
const [isModified, setIsModified] = createSignal(false);

function fileName(): string {
  const path = filePath();
  if (!path) return "Untitled";
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "Untitled";
}

function setClean() {
  setIsModified(false);
}

function setDirty() {
  setIsModified(true);
}

function reset() {
  setFilePath(null);
  setIsModified(false);
}

export const documentState = {
  filePath,
  setFilePath,
  isModified,
  fileName,
  setClean,
  setDirty,
  reset,
};
