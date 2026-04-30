import { Line, LineChart, ResponsiveContainer } from 'recharts';

export interface SparklineProps {
  data: number[];
  color?: string;
}

export function Sparkline({ data, color = 'currentColor' }: SparklineProps) {
  const chartData = data.map((y, i) => ({ x: i, y }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Line
          type="monotone"
          dataKey="y"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
