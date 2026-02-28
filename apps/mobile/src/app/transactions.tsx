import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeColors } from '@/hooks/useColorScheme';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────

interface TransactionItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | string;
  amountCents: number;
  platformFeeCents: number;
  sellerPayoutCents: number;
  currency: string;
  createdAt: string;
  listing: { id: string; title: string };
  buyer: { id: string; displayName: string };
  seller: { id: string; displayName: string };
}

type RoleFilter = 'all' | 'purchases' | 'sales';

// ─── Helpers ──────────────────────────────────────────────────

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Status badge ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed:  { label: 'Completed',  color: '#16a34a', bg: '#dcfce7' },
  pending:    { label: 'Pending',    color: '#b45309', bg: '#fef3c7' },
  processing: { label: 'Processing', color: '#1d4ed8', bg: '#dbeafe' },
  failed:     { label: 'Failed',     color: '#dc2626', bg: '#fee2e2' },
  refunded:   { label: 'Refunded',   color: '#6b7280', bg: '#f3f4f6' },
};

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Transaction row ──────────────────────────────────────────

interface TxRowProps {
  tx: TransactionItem;
  currentUserId: string;
  colors: ReturnType<typeof useThemeColors>;
}

function TransactionRow({ tx, currentUserId, colors }: TxRowProps): React.JSX.Element {
  const isSeller = tx.seller.id === currentUserId;
  const amountCents = isSeller ? tx.sellerPayoutCents : tx.amountCents;
  const counterparty = isSeller ? tx.buyer.displayName : tx.seller.displayName;
  const roleLabel = isSeller ? 'Sale to' : 'Purchase from';

  return (
    <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
      {/* Icon */}
      <View style={[styles.txIcon, { backgroundColor: isSeller ? '#dcfce7' : colors.surface }]}>
        <Ionicons
          name={isSeller ? 'arrow-down-outline' : 'cart-outline'}
          size={20}
          color={isSeller ? '#16a34a' : colors.textSecondary}
        />
      </View>

      {/* Details */}
      <View style={styles.txDetails}>
        <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
          {tx.listing.title}
        </Text>
        <Text style={[styles.txMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {roleLabel} {counterparty}
        </Text>
        <Text style={[styles.txDate, { color: colors.textTertiary }]}>
          {formatDate(tx.createdAt)}
        </Text>
      </View>

      {/* Amount + status */}
      <View style={styles.txRight}>
        <Text
          style={[
            styles.txAmount,
            { color: isSeller ? '#16a34a' : colors.text },
          ]}
        >
          {isSeller ? '+' : '−'}{formatCents(amountCents)}
        </Text>
        <StatusBadge status={tx.status} />
      </View>
    </View>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────

function SkeletonRow({ colors }: { colors: ReturnType<typeof useThemeColors> }): React.JSX.Element {
  return (
    <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.txIcon, { backgroundColor: colors.skeleton }]} />
      <View style={styles.txDetails}>
        <View style={[styles.skeletonLine, { width: '70%', backgroundColor: colors.skeleton }]} />
        <View style={[styles.skeletonLine, { width: '50%', marginTop: 6, backgroundColor: colors.skeleton }]} />
        <View style={[styles.skeletonLine, { width: '30%', marginTop: 4, backgroundColor: colors.skeleton }]} />
      </View>
      <View style={styles.txRight}>
        <View style={[styles.skeletonLine, { width: 60, backgroundColor: colors.skeleton }]} />
        <View style={[styles.skeletonBadge, { backgroundColor: colors.skeleton }]} />
      </View>
    </View>
  );
}

// ─── Page ─────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function TransactionsScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<TransactionItem[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const { isLoading, isFetching, refetch } = useQuery({
    queryKey: ['transactions', page],
    queryFn: async () => {
      const res = await api.payments.getTransactions({ limit: PAGE_SIZE, page });
      const items = (res.data ?? []) as unknown as TransactionItem[];
      const total = res.pagination?.total ?? 0;

      if (page === 1) {
        setAllTransactions(items);
      } else {
        setAllTransactions((prev) => [...prev, ...items]);
      }

      setHasMore(page * PAGE_SIZE < total);
      return res;
    },
  });

  const handleRefresh = useCallback(() => {
    setPage(1);
    setAllTransactions([]);
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setPage((p) => p + 1);
    }
  }, [isFetching, hasMore]);

  // Apply role filter client-side (transactions list is small).
  const filtered = allTransactions.filter((tx) => {
    if (filter === 'purchases') return tx.buyer.id === currentUser?.id;
    if (filter === 'sales') return tx.seller.id === currentUser?.id;
    return true;
  });

  const FILTERS: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'sales', label: 'Sales' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Transactions',
          headerBackTitle: 'Profile',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      {/* Filter tabs */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        {FILTERS.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[
              styles.filterTab,
              filter === key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === key }}
          >
            <Text
              style={[
                styles.filterLabel,
                { color: filter === key ? colors.primary : colors.textSecondary },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={isLoading && allTransactions.length === 0 ? (Array(5).fill(null) as null[]) : filtered}
        keyExtractor={(item, index) =>
          item ? (item as TransactionItem).id : `skeleton-${index}`
        }
        renderItem={({ item }) =>
          item ? (
            <TransactionRow
              tx={item as TransactionItem}
              currentUserId={currentUser?.id ?? ''}
              colors={colors}
            />
          ) : (
            <SkeletonRow colors={colors} />
          )
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + Spacing.xl },
          filtered.length === 0 && !isLoading && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && page === 1}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                {filter === 'purchases'
                  ? "You haven't purchased anything yet."
                  : filter === 'sales'
                    ? "You haven't sold anything yet."
                    : 'In-app purchases and sales will appear here.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              style={[styles.loadMore, { borderColor: colors.border }]}
              onPress={handleLoadMore}
              disabled={isFetching}
            >
              {isFetching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load more</Text>
              )}
            </Pressable>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Filter tabs
  filterBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterLabel: {
    ...Typography.subhead,
    fontWeight: '600',
  },

  // List
  list: {
    flexGrow: 1,
  },
  listEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Transaction row
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  txDetails: {
    flex: 1,
    minWidth: 0,
  },
  txTitle: {
    ...Typography.subhead,
    fontWeight: '600',
    marginBottom: 2,
  },
  txMeta: {
    ...Typography.footnote,
    marginBottom: 2,
  },
  txDate: {
    ...Typography.caption1,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  txAmount: {
    ...Typography.subhead,
    fontWeight: '700',
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    ...Typography.caption2,
    fontWeight: '600',
  },

  // Skeleton
  skeletonLine: {
    height: 12,
    borderRadius: BorderRadius.sm,
  },
  skeletonBadge: {
    width: 64,
    height: 18,
    borderRadius: BorderRadius.full,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.title3,
    textAlign: 'center',
  },
  emptyMessage: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Load more
  loadMore: {
    margin: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  loadMoreText: {
    ...Typography.subhead,
    fontWeight: '600',
  },
});
