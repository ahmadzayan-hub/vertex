"use client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";

const DARK   = "#0f172a"; // slate-900
const GOLD   = "#f59e0b"; // amber-500
const GOLD_L = "#fde68a"; // amber-200

const PALETTE = [GOLD, "#0ea5e9", "#8b5cf6", "#10b981", "#f43f5e", "#6366f1"];

const TIP_STYLE = { borderRadius: 10, fontSize: 12, border: "1px solid #e2e8f0" };
const AXIS_PROPS = { style: { fontSize: 11, fill: "#94a3b8" } };

export function RevenueAreaChart({ data }: { data: { day: string; aed: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={GOLD} stopOpacity={0.35} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={AXIS_PROPS} />
        <YAxis tick={AXIS_PROPS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(v: number) => [`AED ${v.toLocaleString()}`, "Revenue"]}
          contentStyle={TIP_STYLE}
        />
        <Area type="monotone" dataKey="aed" stroke={GOLD} fill="url(#goldFill)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OrdersBarChart({ data }: { data: { day: string; orders: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={AXIS_PROPS} />
        <YAxis allowDecimals={false} tick={AXIS_PROPS} />
        <Tooltip contentStyle={TIP_STYLE} />
        <Bar dataKey="orders" fill={DARK} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelBarChart({ data }: { data: { stage: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 8, left: 60, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" allowDecimals={false} tick={AXIS_PROPS} />
        <YAxis type="category" dataKey="stage" width={120} tick={AXIS_PROPS} />
        <Tooltip contentStyle={TIP_STYLE} />
        <Bar dataKey="value" fill={GOLD} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopProductsChart({ data }: { data: { name: string; orders: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={60} tick={AXIS_PROPS} />
        <YAxis allowDecimals={false} tick={AXIS_PROPS} />
        <Tooltip contentStyle={TIP_STYLE} />
        <Bar dataKey="orders" fill={DARK} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PlatformPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data} dataKey="value" nameKey="name"
          cx="50%" cy="45%" outerRadius={75} innerRadius={42}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Tooltip contentStyle={TIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function StackedStatusChart({
  data,
}: { data: { day: string; paid: number; pending: number; complaints: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={AXIS_PROPS} />
        <YAxis allowDecimals={false} tick={AXIS_PROPS} />
        <Tooltip contentStyle={TIP_STYLE} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="paid"       stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pending"    stackId="a" fill={GOLD} />
        <Bar dataKey="complaints" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { GOLD_L as SOFT };
