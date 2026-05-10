"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CustomTooltip from "./CustomTooltip";

interface TopChartItem {
  name: string;
  value: number;
}

interface TopChartProps {
  data: TopChartItem[];
}

const truncateText = (text: string, maxLength: number) => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const TopChart = ({ data }: TopChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 15, left: -30, bottom: 17 }}
      >
        <CartesianGrid strokeDasharray="0" vertical={false} />

        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          angle={-20}
          textAnchor="end"
          dy={-2}
          dx={30}
          interval={0}
          tick={{ fontSize: 13, fill: "#6B7280" }}
          tickFormatter={(value) => truncateText(value, 12)}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 13, fill: "#6B7280" }}
          tickFormatter={(value) => Math.floor(value).toString()}
          allowDecimals={false}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "#d4e5fc", opacity: 0.3 }}
        />

        <Bar
          dataKey="value"
          fill="#1A73E8"
          radius={[4, 4, 0, 0]}
          barSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopChart;
