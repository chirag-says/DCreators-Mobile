// ============================================
// useRoleSwitch — Client ↔ Creator, from anywhere
//
// The switch used to be a pill in TopHeader, which put it on every screen that
// rendered a header including pushed detail screens where changing role makes
// no sense. It now lives in the side menu and in Settings, and this hook is
// what stops those two copies drifting — particularly the Dashboard reset,
// which is load-bearing rather than cosmetic (see below).
// ============================================

import { useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types';

export interface UseRoleSwitchReturn {
  currentRole: UserRole;
  /** Only a user with a consultant profile has a second role to switch to. */
  canSwitch: boolean;
  /** The role the switch would move them to. */
  otherRole: UserRole;
  switchTo: (role: UserRole) => void;
  /** Flip to the other role. What a single menu row calls. */
  toggle: () => void;
}

/**
 * @param navigation any navigator object — the hook resolves the root stack
 *   from it, so a tab-screen navigator and a stack-screen navigator both work.
 */
export function useRoleSwitch(navigation: any): UseRoleSwitchReturn {
  const currentRole = useAuthStore((s) => s.currentRole);
  const setRole = useAuthStore((s) => s.setRole);
  const consultantProfile = useAuthStore((s) => s.consultantProfile);

  const otherRole: UserRole = currentRole === 'consultant' ? 'client' : 'consultant';

  const switchTo = useCallback(
    (role: UserRole) => {
      if (role === currentRole) return;
      setRole(role);

      // Screens are role-owned. Flipping the switch used to change only the
      // store, so a consultant-only screen (CreatorWorkorder, the portfolio
      // editor, an assignment) stayed on screen under a header that now said
      // Client — showing data the active role has no business seeing, with more
      // of it still sitting in the back stack.
      //
      // Sending them to the Dashboard fixes both: the stack pops back to Main,
      // and DashboardScreen renders the right home for whichever role is now
      // active. getParent() resolves the root stack whether the caller is
      // mounted inside a tab screen or a stack screen; when it is already the
      // root, getParent() is undefined and `navigation` is the stack itself.
      const root = navigation?.getParent?.() ?? navigation;
      root?.navigate('Main', { screen: 'Dashboard' });
    },
    [currentRole, setRole, navigation],
  );

  const toggle = useCallback(() => switchTo(otherRole), [switchTo, otherRole]);

  return {
    currentRole,
    canSwitch: !!consultantProfile,
    otherRole,
    switchTo,
    toggle,
  };
}
