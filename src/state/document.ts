/**
 * Document state — now delegates to tab store for multi-tab support.
 * Maintains the same API surface so existing imports continue to work.
 */
import { tabsState } from "./tabs";

export const documentState = {
  filePath: tabsState.filePath,
  setFilePath: tabsState.setActiveFilePath,
  isModified: tabsState.isModified,
  fileName: tabsState.fileName,
  setClean: tabsState.setActiveClean,
  setDirty: tabsState.setActiveDirty,
  reset: tabsState.resetActive,
};
