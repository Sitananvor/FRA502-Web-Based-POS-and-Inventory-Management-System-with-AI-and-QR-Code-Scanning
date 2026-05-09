"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CustomTooltip from "./CustomTooltip";

interface SalesChartItem {
  name: string;
  sales: number;
}

interface SalesChartProps {
  sales: SalesChartItem[];
}

const truncateText = (text: string, maxLength: number) => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const SalesChart = ({ sales }: SalesChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        data={sales}
        margin={{ top: 10, right: 15, left: -30, bottom: 17 }}
      >
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          angle={-20}
          textAnchor="end"
          dy={7}
          dx={10}
          tick={{ fontSize: 13 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
          }
          tick={{ fontSize: 13 }}
          interval={0}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="sales"
          stroke="#1A73E8"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorSales)"
          dot={{ r: 4, fill: "#1A73E8", strokeWidth: 2, stroke: "#ffffff" }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default SalesChart;
