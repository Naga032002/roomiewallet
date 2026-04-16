import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGroupMembersDisplayNames, removeMember } from '@/services/db';
import { calculateMemberFinancialSummary } from '@/lib/financialUtils';
import { formatCurrency } from '@/lib/finance';
import { Crown, ChevronRight, CheckCircle, AlertCircle, UserRound, Loader2, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Member = { uid: string; name: string };

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#4F46E5,#7C3AED)',
  'linear-gradient(135deg,#0891B2,#0E7490)',
  'linear-gradient(135deg,#059669,#047857)',
  'linear-gradient(135deg,#D97706,#B45309)',
  'linear-gradient(135deg,#DB2777,#BE185D)',
  'linear-gradient(135deg,#7C3AED,#6D28D9)',
];

export const Members = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { allGroups, currentGroup, transactions, currentBudget, selectedMonthYear, syncMembers } = useGroupStore();
  const { user } = useAuth();

  const group = allGroups.find(g => g.id === roomId) ?? currentGroup;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!group) return;
    setLoading(true);
    fetchGroupMembersDisplayNames(group.id).then(setMembers).catch(console.error).finally(() => setLoading(false));
  }, [group?.id]);

  if (!group) return null;

  const isAdmin     = group.adminId === user?.uid;
  const memberCount = group.memberUids.length;
  const effective   = currentBudget ? { ...currentBudget, perMemberShare: currentBudget.totalAmount / memberCount } : null;
  const totalContributions = transactions.filter(t => !t.isDeleted && t.type === 'CONTRIBUTION').reduce((s, t) => s + t.amount, 0);

  const handleRemove = async (uid: string) => {
    if (!group || !isAdmin || !confirm('Remove this member from the room?')) return;
    await removeMember(group.id, uid).catch(console.error);
    setMembers(prev => prev.filter(m => m.uid !== uid));
    syncMembers();
  };

  return (
    <div className="space-y-4 pb-4">

      {/* ── Stats row ── */}
      {effective ? (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Rent', value: effective.totalAmount, cls: 'text-slate-800' },
            { label: 'Per Member', value: effective.perMemberShare, cls: 'text-indigo-600' },
            { label: 'Collected',  value: totalContributions,       cls: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="rw-card p-3 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate">{s.label}</p>
              <p className={`text-sm font-extrabold mt-1 ${s.cls}`}>{formatCurrency(s.value)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">No budget set for {selectedMonthYear}</p>
        </div>
      )}

      {/* ── Members list ── */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : (
        <div className="space-y-2.5">
          {members.map((m, i) => {
            const f = calculateMemberFinancialSummary(m.uid, memberCount, transactions, effective ? [effective] : []);
            const isAdminM  = m.uid === group.adminId;
            const isYou     = m.uid === user?.uid;
            const settled   = Math.abs(f.pendingContribution) < 1;
            const owes      = f.pendingContribution > 0;
            const progress  = effective?.perMemberShare
              ? Math.min(100, Math.round((f.totalContributed / effective.perMemberShare) * 100)) : 0;

            return (
              <div key={m.uid} className={cn('rw-card overflow-hidden', isYou ? 'ring-2 ring-indigo-200' : '')}>
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/room/${roomId}/members/${m.uid}`)}>
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-extrabold text-white flex-shrink-0 shadow-md"
                    style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="font-extrabold text-slate-800 text-sm">{m.name}</span>
                      {isAdminM && (
                        <span className="chip-amber inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                          <Crown className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                      {isYou && (
                        <span className="chip-indigo px-1.5 py-0.5 rounded-full text-[10px] font-bold">You</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Paid {formatCurrency(f.totalContributed)}{effective ? ` of ${formatCurrency(effective.perMemberShare)}` : ''}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {settled ? (
                      <span className="chip-green inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold">
                        <CheckCircle className="w-3 h-3" /> Settled
                      </span>
                    ) : owes ? (
                      <span className="chip-rose px-2 py-1 rounded-full text-xs font-bold">
                        −{formatCurrency(f.pendingContribution)}
                      </span>
                    ) : (
                      <span className="chip-green px-2 py-1 rounded-full text-xs font-bold">
                        +{formatCurrency(Math.abs(f.pendingContribution))}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>

                {/* Progress */}
                {effective && (
                  <div className="px-4 pb-3">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                      <span>Contribution</span>
                      <span className={progress >= 100 ? 'text-emerald-600 font-bold' : ''}>{progress}%</span>
                    </div>
                    <div className="rw-progress-track">
                      <div className={cn('rw-progress-fill', progress >= 100 ? 'rw-gradient-green' : '')}
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Remove (admin only) */}
                {isAdmin && !isYou && !isAdminM && (
                  <div className="px-4 pb-3">
                    <button onClick={() => handleRemove(m.uid)}
                      className="flex items-center gap-1.5 text-[11px] text-rose-400 hover:text-rose-600 transition-colors font-semibold">
                      <UserMinus className="w-3 h-3" /> Remove from room
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
