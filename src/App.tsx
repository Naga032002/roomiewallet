import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useGroupStore } from './store/useGroupStore';

import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { RoomLayout } from './components/RoomLayout';

import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { RoomDashboard } from './pages/RoomDashboard';
import { Members } from './pages/Members';
import { MemberDetail } from './pages/MemberDetail';
import { Transactions } from './pages/Transactions';
import { TransactionDetail } from './pages/TransactionDetail';
import { AddTransaction } from './pages/AddTransaction';
import { RoomWallet } from './pages/RoomWallet';

function App() {
  const { user, loading } = useAuth();
  const { loadUserGroups, setCurrentGroup, setAllGroups } = useGroupStore();

  useEffect(() => {
    // Don't act while auth is still resolving (important for OAuth redirect-back)
    if (loading) return;

    if (user) {
      // Load all rooms this user belongs to
      loadUserGroups(user.uid).catch(err => {
        console.error('loadUserGroups failed:', err);
      });
    } else {
      // User signed out — clear all group state
      setCurrentGroup(null);
      setAllGroups([]);
    }
  }, [user, loading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/onboarding" element={
          <ProtectedRoute><Onboarding /></ProtectedRoute>
        } />

        {/* Outer 2-tab shell: Home + Profile */}
        <Route element={
          <ProtectedRoute><DashboardLayout /></ProtectedRoute>
        }>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Room inner shell: 4-tab bottom nav */}
        <Route path="/room/:roomId" element={
          <ProtectedRoute><RoomLayout /></ProtectedRoute>
        }>
          <Route index element={<RoomDashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="members/:memberId" element={<MemberDetail />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="transactions/:transactionId" element={<TransactionDetail />} />
          <Route path="add-expense" element={<AddTransaction />} />
          <Route path="wallet" element={<RoomWallet />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
