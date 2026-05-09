"use client";

interface TooltipPayload {
  value: number;
  name?: string;
  color?: string;
  payload?: any;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    return (
      <div className="tooltip-active bg-white p-3 border border-[#EBF4FF] shadow-lg rounded-lg">
        <p className="tooltip-label font-semibold text-gray-700 text-[14px] mb-1">{label}</p>
        <p className="tooltip-payload font-mono text-[15px] text-[#2657c1]">
          {Number(payload[0].value).toLocaleString()}
        </p>
      </div>
    );
  }

  return null;
};

export default CustomTooltip;