import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  CreditCard, 
  Users, 
  TrendingUp, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  AlertCircle,
  HelpCircle,
  Clock,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SettleUpModal from './SettleUpModal';
import { BalancesSkeleton } from '../common/Skeletons';

export default function TripBalancesView({ tripId, trip, onRefreshTrip }) {
  const { user } = useAuth();
  const toast = useToast();
  const { formatPrice } = useCurrency();

  const [balanceData, setBalanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Settle modal state
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleInitialData, setSettleInitialData] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/trips/${tripId}/balances`);
      if (res.data?.success) {
        setBalanceData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load trip balances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchBalances();
    }
  }, [tripId]);

  const handleOpenSettle = (prefill = null) => {
    setSettleInitialData(prefill);
    setSettleModalOpen(true);
  };

  const handleDeleteSettlement = async (settlementId) => {
    if (!window.confirm('Are you sure you want to revert/delete this settlement record?')) return;
    try {
      setDeletingId(settlementId);
      await api.delete(`/settlements/${settlementId}`);
      toast.success('Settlement record deleted');
      await fetchBalances();
      if (onRefreshTrip) onRefreshTrip();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete settlement.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !balanceData) {
    return <BalancesSkeleton />;
  }

  if (error && !balanceData) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center my-4">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
        <p className="text-sm font-bold">{error}</p>
        <button
          onClick={fetchBalances}
          className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    base_currency = 'INR',
    members = [],
    current_user_balance,
    suggested_settlements = [],
    settlements = [],
    is_settled_up = false,
  } = balanceData || {};

  const myNet = current_user_balance?.net_balance || 0;
  const isCreditor = myNet > 0.01;
  const isDebtor = myNet < -0.01;
  const isEven = !isCreditor && !isDebtor;

  return (
    <div className="space-y-6">
      {/* 1. PERSONAL STANDING BANNER */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          isCreditor
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/80'
            : isDebtor
            ? 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200/80'
            : 'bg-gradient-to-r from-slate-50 to-indigo-50/40 border-slate-200/80'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isCreditor
                ? 'bg-emerald-600 text-white'
                : isDebtor
                ? 'bg-rose-600 text-white'
                : 'bg-indigo-600 text-white'
            }`}
          >
            {isCreditor ? (
              <ArrowUpRight className="w-6 h-6" />
            ) : isDebtor ? (
              <ArrowDownRight className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Your Group Net Standing
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isCreditor
                    ? 'bg-emerald-100 text-emerald-800'
                    : isDebtor
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {isCreditor ? 'Owed to you' : isDebtor ? 'You owe' : 'Settled up'}
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {formatPrice(Math.abs(myNet), base_currency).formatted}
              </h3>
              <span className="text-xs text-slate-500">in trip base currency ({base_currency})</span>
            </div>

            <p className="text-xs text-slate-600 mt-1">
              {isCreditor
                ? 'Companions owe you money for your paid shared expenses.'
                : isDebtor
                ? 'You have unsettled shared expenses to pay your companions.'
                : 'You do not owe or have any pending debts for this trip.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={() => handleOpenSettle()}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow transition-all flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Settle Up</span>
          </button>

          <button
            onClick={fetchBalances}
            title="Refresh Balances"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. OPTIMAL DEBT SETTLEMENTS */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Optimal Debt Settlements</h3>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>Smart Simplification</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Minimal cash-flow algorithm calculates the fewest peer-to-peer transfers needed to settle all trip debts.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-400 self-start sm:self-auto">
            {suggested_settlements.length} {suggested_settlements.length === 1 ? 'transfer' : 'transfers'} needed
          </span>
        </div>

        {suggested_settlements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {suggested_settlements.map((item, idx) => {
              const isMePaying = item.from_user === user?.id;
              const isMeReceiving = item.to_user === user?.id;

              return (
                <div
                  key={`${item.from_user}-${item.to_user}-${idx}`}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isMePaying
                      ? 'bg-rose-50/40 border-rose-200'
                      : isMeReceiving
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Debtor Avatar */}
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {item.from_name.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-800 truncate">
                        <span className="truncate">{item.from_name}</span>
                        {isMePaying && <span className="text-rose-600 shrink-0">(You)</span>}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate block">owes</span>
                    </div>

                    {/* Arrow with transfer amount */}
                    <div className="flex flex-col items-center px-1 shrink-0">
                      <span className="text-xs font-black font-mono text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                        {formatPrice(item.amount, base_currency).formatted}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5" />
                    </div>

                    {/* Creditor Avatar */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-800 truncate">
                        <span className="truncate">{item.to_name}</span>
                        {isMeReceiving && <span className="text-emerald-600 shrink-0">(You)</span>}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate block">receives</span>
                    </div>
                  </div>

                  {/* 1-Click Settle Action */}
                  <button
                    onClick={() =>
                      handleOpenSettle({
                        from_user: item.from_user,
                        to_user: item.to_user,
                        amount: item.amount,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs hover:shadow transition-all shrink-0"
                  >
                    Settle
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 px-4 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">All debts are settled!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Everyone is even. There are no outstanding debts or transfers required for this trip.
            </p>
          </div>
        )}
      </div>

      {/* 3. MEMBER BALANCES BREAKDOWN */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Member Net Balances</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive financial breakdown per companion.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="pb-3 pl-1 font-bold">Member</th>
                <th className="pb-3 text-right">Total Paid ({base_currency})</th>
                <th className="pb-3 text-right">Share Owed ({base_currency})</th>
                <th className="pb-3 text-right">Net Settled ({base_currency})</th>
                <th className="pb-3 pr-1 text-right">Net Balance ({base_currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => {
                const isMe = m.user_id === user?.id;
                const netSettled = (m.total_settled_sent || 0) - (m.total_settled_received || 0);

                return (
                  <tr key={m.user_id} className={`hover:bg-slate-50/50 transition-colors ${isMe ? 'bg-indigo-50/20' : ''}`}>
                    <td className="py-3 pl-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {m.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 truncate block">
                            {m.name} {isMe && <span className="text-indigo-600 font-semibold">(You)</span>}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate block">{m.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 text-right font-mono font-semibold text-slate-700">
                      {formatPrice(m.total_paid_base, base_currency).formatted}
                    </td>

                    <td className="py-3 text-right font-mono font-semibold text-slate-700">
                      {formatPrice(m.total_owed_base, base_currency).formatted}
                    </td>

                    <td className="py-3 text-right font-mono text-slate-500">
                      {netSettled !== 0 ? (
                        <span className={netSettled > 0 ? 'text-emerald-600' : 'text-slate-600'}>
                          {netSettled > 0 ? `+${formatPrice(netSettled, base_currency).formatted}` : formatPrice(netSettled, base_currency).formatted}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 pr-1 text-right">
                      {m.net_balance > 0.01 ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>+{formatPrice(m.net_balance, base_currency).formatted}</span>
                        </span>
                      ) : m.net_balance < -0.01 ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl">
                          <ArrowDownRight className="w-3 h-3" />
                          <span>{formatPrice(m.net_balance, base_currency).formatted}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Settled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SETTLEMENT AUDIT LOG (HISTORY) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Settlement History</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit log of all peer-to-peer repayments recorded for this trip.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {settlements.length} {settlements.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {settlements.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {settlements.map((s) => {
              const isPayer = s.from_user === user?.id;
              const isReceiver = s.to_user === user?.id;
              const canDelete = isPayer || isReceiver || trip?.created_by === user?.id || trip?.role === 'owner';
              const dateStr = s.settled_at ? new Date(s.settled_at).toLocaleDateString() : 'Recent';

              return (
                <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        <span>{s.from_name}</span>
                        <span className="text-slate-400 font-normal"> paid </span>
                        <span>{s.to_name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                      {formatPrice(s.amount, base_currency).formatted}
                    </span>

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteSettlement(s.id)}
                        disabled={deletingId === s.id}
                        title="Revert settlement"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            No settlements recorded yet for this trip.
          </div>
        )}
      </div>

      {/* Settle Up Modal */}
      {settleModalOpen && (
        <SettleUpModal
          isOpen={settleModalOpen}
          onClose={() => {
            setSettleModalOpen(false);
            setSettleInitialData(null);
          }}
          onSettled={async () => {
            await fetchBalances();
            if (onRefreshTrip) onRefreshTrip();
          }}
          tripId={tripId}
          members={members}
          initialData={settleInitialData}
          baseCurrency={base_currency}
        />
      )}
    </div>
  );
}
