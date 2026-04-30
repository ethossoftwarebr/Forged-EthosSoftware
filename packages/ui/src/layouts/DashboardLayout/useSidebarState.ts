import { useCallback, useEffect, useState } from 'react';

interface PersistedState {
  collapsed: boolean;
  expandedGroups: Record<string, boolean>;
}

interface UseSidebarStateOptions {
  storageKey?: string;
  defaultCollapsed?: boolean;
}

export interface UseSidebarStateReturn {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (key: string) => void;
  isGroupExpanded: (key: string) => boolean;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

/**
 * Hook de estado do sidebar com persistencia em localStorage.
 *
 * SSR-safe: hidrata do storage no `useEffect` (apos mount). O default `collapsed`
 * vem do prop `defaultCollapsed` ate hidratar.
 */
export function useSidebarState({
  storageKey = 'default',
  defaultCollapsed = false,
}: UseSidebarStateOptions = {}): UseSidebarStateReturn {
  const fullKey = `ethos:sidebar:${storageKey}`;

  const [collapsed, setCollapsedState] = useState<boolean>(defaultCollapsed);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Hidrata do localStorage no client (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (typeof parsed.collapsed === 'boolean') setCollapsedState(parsed.collapsed);
        if (parsed.expandedGroups && typeof parsed.expandedGroups === 'object') {
          setExpandedGroups(parsed.expandedGroups);
        }
      }
    } catch {
      // localStorage indisponivel ou JSON invalido — silencioso
    }
    setHydrated(true);
  }, [fullKey]);

  // Persiste no localStorage quando muda (apos hidratacao)
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(fullKey, JSON.stringify({ collapsed, expandedGroups }));
    } catch {
      // quota exceeded ou bloqueado — silencioso
    }
  }, [collapsed, expandedGroups, fullKey, hydrated]);

  const setCollapsed = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    if (typeof v === 'function') {
      setCollapsedState((prev) => v(prev));
    } else {
      setCollapsedState(v);
    }
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isGroupExpanded = useCallback(
    (key: string) => expandedGroups[key] ?? false,
    [expandedGroups],
  );

  return {
    collapsed,
    setCollapsed,
    expandedGroups,
    toggleGroup,
    isGroupExpanded,
    mobileOpen,
    setMobileOpen,
  };
}
