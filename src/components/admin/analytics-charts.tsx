// src/components/admin/analytics-charts.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency, formatDate, truncate, cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageViewDataPoint {
  date: string;
  count: number;
}

interface TopProjectDataPoint {
  title: string;
  views: number;
}

interface OrderSourceDataPoint {
  source: string;
  count: number;
}

interface AnalyticsData {
  pageViews: PageViewDataPoint[];
  topProjects: TopProjectDataPoint[];
  orderSources: OrderSourceDataPoint[];
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
}

interface AnalyticsChartsProps {
  dateRange: '7d' | '30d' | '90d';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIE_COLORS: Record<string, string> = {
  direct: 'var(--zymbiq-accent)',
  showroom: 'var(--zymbiq-primary)',
  blog: 'var(--zymbiq-secondary)',
  custom: 'var(--zymbiq-muted)',
};

const PIE_FALLBACK_COLORS = [
  'var(--zymbiq-accent)',
  'var(--zymbiq-primary)',
  'var(--zymbiq-secondary)',
  'var(--zymbiq-muted)',
];

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
  formatter?: (value: number) => string;
}

function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-surface border border-border shadow-md rounded-md px-3 py-2 text-sm">
      {label && (
        <p className="text-muted text-xs mb-1">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="font-medium" style={{ color: entry.color ?? 'var(--zymbiq-text)' }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyChart({ height = 300 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-muted text-sm"
      style={{ height }}
    >
      No data yet
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-[--zymbiq-radius] p-5">
      <p className="text-muted text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-muted/20 rounded-[--zymbiq-radius]"
      style={{ height }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AnalyticsCharts({ dateRange }: AnalyticsChartsProps) {
  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ['analytics', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?range=${dateRange}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      return json.data as AnalyticsData;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-muted/20 rounded-[--zymbiq-radius] h-24"
            />
          ))}
        </div>
        <ChartSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Failed to load analytics data.
      </div>
    );
  }

  const hasPageViews = data.pageViews.length > 0;
  const hasTopProjects = data.topProjects.length > 0;
  const hasOrderSources = data.orderSources.length > 0;

  // Format X-axis dates for line chart
  const formattedPageViews = data.pageViews.map((d) => ({
    ...d,
    label: formatDate(d.date, 'MMM d'),
  }));

  // Truncate long project titles for bar chart
  const formattedTopProjects = data.topProjects.map((d) => ({
    ...d,
    shortTitle: truncate(d.title, 20),
  }));

  return (
    <div className="space-y-8">

      {/* ------------------------------------------------------------------ */}
      {/* Stat Cards                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={data.totalOrders.toLocaleString()} />
        <StatCard label="Total Revenue" value={formatCurrency(data.totalRevenue, 'USD')} />
        <StatCard
          label="Conversion Rate"
          value={`${data.conversionRate.toFixed(1)}%`}
        />
        <StatCard
          label="Avg. Revenue / Order"
          value={
            data.totalOrders > 0
              ? formatCurrency(data.totalRevenue / data.totalOrders, 'USD')
              : '—'
          }
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Page Views — Line Chart                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-surface border border-border rounded-[--zymbiq-radius] p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Page Views</h3>
        {hasPageViews ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedPageViews} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--zymbiq-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--zymbiq-muted)' }}
                axisLine={{ stroke: 'var(--zymbiq-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--zymbiq-muted)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={
                  <CustomTooltip formatter={(v) => v.toLocaleString()} />
                }
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Views"
                stroke="var(--zymbiq-accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--zymbiq-accent)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom row: Top Projects + Order Sources                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Projects — Bar Chart */}
        <div className="bg-surface border border-border rounded-[--zymbiq-radius] p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Projects by Views</h3>
          {hasTopProjects ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={formattedTopProjects}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--zymbiq-border)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'var(--zymbiq-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortTitle"
                  width={100}
                  tick={{ fontSize: 11, fill: 'var(--zymbiq-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={
                    <CustomTooltip formatter={(v) => v.toLocaleString()} />
                  }
                />
                <Bar
                  dataKey="views"
                  name="Views"
                  fill="var(--zymbiq-accent)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Order Sources — Pie Chart */}
        <div className="bg-surface border border-border rounded-[--zymbiq-radius] p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Order Sources</h3>
          {hasOrderSources ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.orderSources}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {data.orderSources.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        PIE_COLORS[entry.source.toLowerCase()] ??
                        PIE_FALLBACK_COLORS[index % PIE_FALLBACK_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <CustomTooltip formatter={(v) => v.toLocaleString()} />
                  }
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span
                      className="text-xs capitalize"
                      style={{ color: 'var(--zymbiq-muted)' }}
                    >
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

      </div>
    </div>
  );
}