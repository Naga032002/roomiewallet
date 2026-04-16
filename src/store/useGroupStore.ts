import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Group, MonthlyBudget, Transaction } from '../types';
import {
  fetchUserGroups,
  fetchGroupTransactions,
  fetchMonthlyBudget,
  fetchGroupMembersDisplayNames
} from '../services/db';

export type MemberEntry = { uid: string; name: string };

interface GroupState {
  // ── Multi-room ──
  allGroups: Group[];
  activeRoomId: string | null;
  loadingGroups: boolean;

  // ── Active room data ──
  currentGroup: Group | null;
  currentMember: { uid: string; role: string } | null;
  groupMembers: MemberEntry[];
  loadingMembers: boolean;

  // ── Finances ──
  selectedMonthYear: string;
  transactions: Transaction[];
  currentBudget: MonthlyBudget | null;
  isLoadingFinances: boolean;

  // ── Actions ──
  setCurrentGroup: (group: Group | null) => void;
  setCurrentMember: (member: { uid: string; role: string } | null) => void;
  setSelectedMonthYear: (monthYear: string) => void;
  setActiveRoom: (roomId: string) => void;
  setAllGroups: (groups: Group[]) => void;

  // ── Thunks ──
  loadUserGroups: (uid: string) => Promise<void>;
  syncFinances: () => Promise<void>;
  syncMembers: () => Promise<void>;
  refreshCurrentGroup: () => void;
}

const getCurrentMonthStr = () => {
  const d = new Date();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
};

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      // ── Initial state ──
      allGroups: [],
      activeRoomId: null,
      loadingGroups: false,

      currentGroup: null,
      currentMember: null,
      groupMembers: [],
      loadingMembers: false,

      selectedMonthYear: getCurrentMonthStr(),
      transactions: [],
      currentBudget: null,
      isLoadingFinances: false,

      // ── Sync actions ──
      setAllGroups: (groups) => set({ allGroups: groups }),

      setCurrentGroup: (group) => {
        set({ currentGroup: group });
        if (group) {
          // fire-and-forget — don't let member fetch crash callers
          get().syncMembers().catch(console.error);
        } else {
          set({ groupMembers: [] });
        }
      },

      setCurrentMember: (member) => set({ currentMember: member }),

      setSelectedMonthYear: (monthYear) => {
        set({ selectedMonthYear: monthYear });
        // fire-and-forget
        get().syncFinances().catch(console.error);
      },

      setActiveRoom: (roomId) => {
        const group = get().allGroups.find(g => g.id === roomId) ?? null;
        set({ activeRoomId: roomId, currentGroup: group });
        if (group) {
          get().syncMembers().catch(console.error);
          get().syncFinances().catch(console.error);
        }
      },

      refreshCurrentGroup: () => {
        const { allGroups, activeRoomId } = get();
        const group = activeRoomId
          ? (allGroups.find(g => g.id === activeRoomId) ?? allGroups[0] ?? null)
          : (allGroups[0] ?? null);
        set({ currentGroup: group });
      },

      // ─────────────────────────────────────────────────
      // loadUserGroups — PERMANENT BULLETPROOF THUNK
      // ─────────────────────────────────────────────────
      loadUserGroups: async (uid) => {
        if (!uid) return; // guard: never call with empty uid

        set({ loadingGroups: true });
        try {
          // fetchUserGroups has its own try/catch and never throws
          const groups = await fetchUserGroups(uid);

          const { activeRoomId } = get();
          const activeGroup = activeRoomId
            ? (groups.find(g => g.id === activeRoomId) ?? groups[0] ?? null)
            : (groups[0] ?? null);

          set({
            allGroups: groups,
            currentGroup: activeGroup,
            activeRoomId: activeGroup?.id ?? null,
            loadingGroups: false,
          });

          if (activeGroup) {
            // fire-and-forget — don't let these crash the load
            get().syncMembers().catch(console.error);
            get().syncFinances().catch(console.error);
          }
        } catch (e) {
          console.error('loadUserGroups unexpected error:', e);
          // Always clear loading state so UI doesn't get stuck
          set({ loadingGroups: false });
        }
      },

      // ─────────────────────────────────────────────────
      // syncMembers — safe, never crashes callers
      // ─────────────────────────────────────────────────
      syncMembers: async () => {
        const { currentGroup } = get();
        if (!currentGroup) return;

        set({ loadingMembers: true });
        try {
          const members = await fetchGroupMembersDisplayNames(currentGroup.id);
          set({ groupMembers: members, loadingMembers: false });
        } catch (e) {
          console.error('syncMembers error:', e);
          // Fallback: show raw UIDs so UI doesn't break
          const fallback = (currentGroup.memberUids ?? []).map(uid => ({
            uid,
            name: uid.substring(0, 8),
          }));
          set({ groupMembers: fallback, loadingMembers: false });
        }
      },

      // ─────────────────────────────────────────────────
      // syncFinances — safe, never crashes callers
      // ─────────────────────────────────────────────────
      syncFinances: async () => {
        const { currentGroup, selectedMonthYear } = get();
        if (!currentGroup) return;

        set({ isLoadingFinances: true });
        try {
          const [trans, budget] = await Promise.all([
            fetchGroupTransactions(currentGroup.id, selectedMonthYear),
            fetchMonthlyBudget(currentGroup.id, selectedMonthYear),
          ]);
          set({ transactions: trans, currentBudget: budget, isLoadingFinances: false });
        } catch (e) {
          console.error('syncFinances error:', e);
          set({ isLoadingFinances: false });
        }
      },
    }),
    {
      name: 'roomiewallet-group-store',
      // Only persist lightweight scalars — never persist arrays/objects
      // that can grow stale or corrupt across sessions
      partialize: (state) => ({
        activeRoomId: state.activeRoomId,
        selectedMonthYear: state.selectedMonthYear,
      }),
    }
  )
);
