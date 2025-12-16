/**
 * Store for managing YAML preview scroll position.
 * Tracks what section or asset should be scrolled to.
 */
import { create } from 'zustand';

interface YamlScrollState {
  // The section to scroll to (e.g., 'schemas', 'agents', 'tools')
  targetSection: string | null;
  // The specific asset reference name to scroll to (e.g., 'my_tool')
  targetAsset: string | null;
  // Timestamp to trigger re-scroll even if same target
  scrollTimestamp: number;
  
  // Scroll to a section header (e.g., 'schemas:')
  scrollToSection: (section: string) => void;
  // Scroll to a specific asset by reference name (e.g., 'my_tool: &my_tool')
  scrollToAsset: (refName: string) => void;
  // Clear the scroll target
  clearTarget: () => void;
}

export const useYamlScrollStore = create<YamlScrollState>((set) => ({
  targetSection: null,
  targetAsset: null,
  scrollTimestamp: 0,
  
  scrollToSection: (section) => set({
    targetSection: section,
    targetAsset: null,
    scrollTimestamp: Date.now(),
  }),
  
  scrollToAsset: (refName) => set({
    targetSection: null,
    targetAsset: refName,
    scrollTimestamp: Date.now(),
  }),
  
  clearTarget: () => set({
    targetSection: null,
    targetAsset: null,
  }),
}));



