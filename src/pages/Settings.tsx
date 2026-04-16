import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupStore } from '@/store/useGroupStore';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield, Bell, ChevronRight, Moon, Trash2, Crown, PlusCircle, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { setMonthlyBudget } from '@/services/db';
import { cn } from '@/lib/utils';

export const Settings = () => {
  const { user, logout } = useAuth();
  const { currentGroup, selectedMonthYear, syncFinances } = useGroupStore();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetMsg, setBudgetMsg] = useState('');

  const isAdmin = currentGroup?.adminId === user?.uid;
  const memberCount = currentGroup?.memberUids?.length ?? 1;

  const handleSaveBudget = async () => {
    if (!newBudget || !currentGroup || !user) return;
    setSavingBudget(true);
    try {
      await setMonthlyBudget(currentGroup.id, selectedMonthYear, Number(newBudget), memberCount, user.uid);
      await syncFinances();
      setBudgetMsg('✓ Budget updated!');
      setNewBudget('');
      setTimeout(() => setBudgetMsg(''), 3000);
    } catch (e: any) {
      setBudgetMsg(e.message);
    } finally { setSavingBudget(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // Remove from group members
      await supabase.from('group_members').delete().eq('user_id', user.uid);
      // Delete profile
      await supabase.from('profiles').delete().eq('id', user.uid);
      // Sign out (account deletion requires admin SDK; we sign out instead)
      await logout();
      navigate('/login');
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', sub: user?.email ?? '', action: () => {} },
        { icon: Bell, label: 'Notifications', sub: 'Manage alerts', action: () => {} },
        { icon: Moon, label: 'Appearance', sub: 'Light mode', action: () => {} },
      ]
    },
    ...(currentGroup ? [{
      title: 'Group',
      items: [
        {
          icon: Crown,
          label: currentGroup.name,
          sub: isAdmin ? 'You are the Admin' : 'Member',
          action: () => {}
        },
        {
          icon: Shield,
          label: 'Invite Code',
          sub: currentGroup.inviteCode,
          action: () => {
            navigator.clipboard.writeText(currentGroup.inviteCode);
          }
        },
      ]
    }] : []),
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-400 text-sm">Profile & preferences</p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-500 to-purple-600" />
        <CardContent className="pt-0 pb-6">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-indigo-700">
              {user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="pb-1">
              <p className="font-bold text-slate-900 text-lg">{user?.displayName}</p>
              <p className="text-slate-400 text-sm">{user?.email}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
              <Crown className="w-3 h-3" /> Room Admin · {currentGroup?.name}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menu Sections */}
      {menuSections.map(section => (
        <div key={section.title}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">{section.title}</p>
          <Card className="border border-slate-100 shadow-sm divide-y divide-slate-50">
            {section.items.map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            ))}
          </Card>
        </div>
      ))}

      {/* Admin: Edit Budget */}
      {isAdmin && currentGroup && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Room Budget</p>
          <Card className="border border-slate-100 shadow-sm">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Update Monthly Rent</p>
                <p className="text-xs text-slate-400">Total budget ÷ {memberCount} members = per-person share</p>
              </div>
              {budgetMsg && (
                <div className={`p-2.5 rounded-xl text-sm ${budgetMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {budgetMsg}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Total rent (₹)"
                  value={newBudget}
                  onChange={e => setNewBudget(e.target.value)}
                  className="flex-1 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:border-indigo-300"
                />
                <button
                  onClick={handleSaveBudget}
                  disabled={savingBudget}
                  className="h-11 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {savingBudget ? '...' : 'Save'}
                </button>
              </div>
              {newBudget && Number(newBudget) > 0 && (
                <p className="text-xs text-indigo-600 font-semibold">
                  → ₹{(Number(newBudget) / memberCount).toFixed(0)} per member ({memberCount} members)
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Group Actions */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">
          {currentGroup ? 'Group' : 'Get Started'}
        </p>
        <Card className="border border-slate-100 shadow-sm divide-y divide-slate-50">
          <Link to="/onboarding?mode=create" className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <PlusCircle className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800 text-sm">Create New Group</p>
              <p className="text-xs text-slate-400">Start a new shared room</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </Link>
          <Link to="/onboarding?mode=join" className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800 text-sm">Join Existing Group</p>
              <p className="text-xs text-slate-400">Enter an invite code</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </Link>
        </Card>
      </div>

      {/* Danger Zone */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Account Actions</p>
        <Card className="border border-slate-100 shadow-sm divide-y divide-slate-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-4 h-4 text-slate-600" />
            </div>
            <p className="font-medium text-slate-800 text-sm flex-1">Sign Out</p>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-4 h-4 text-red-500" />
            </div>
            <p className="font-medium text-red-600 text-sm flex-1">Remove Account</p>
          </button>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Remove Account?</h3>
              <p className="text-slate-500 text-sm mt-1">You will be removed from your group. This cannot be undone.</p>
            </div>
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Yes, Remove My Account'}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
