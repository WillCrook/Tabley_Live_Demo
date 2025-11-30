import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

const Analytics = () => {
  const [selectedMetric, setSelectedMetric] = useState("Total Bookings");
  const [dateRange, setDateRange] = useState("previous_month");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  // Calculate number of days based on selected range
  const getDaysCount = () => {
    if (dateRange === "previous_week") return 7;
    if (dateRange === "previous_month") return 30;
    if (dateRange === "custom_range" && customDateRange?.from && customDateRange?.to) {
      const diffTime = Math.abs(customDateRange.to.getTime() - customDateRange.from.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    return 30;
  };

  const getStartDate = () => {
    if (dateRange === "custom_range" && customDateRange?.from) {
      return customDateRange.from;
    }
    const today = new Date();
    const daysCount = getDaysCount();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysCount + 1);
    return startDate;
  };

  const metrics = [
    {
      title: "Total Bookings",
      current: 342,
      previous: 298,
      change: 14.8,
      trend: "up",
    },
    {
      title: "Cancellation Rate",
      current: 8.2,
      previous: 12.4,
      change: -33.9,
      trend: "down",
      suffix: "%",
    },
    {
      title: "Avg. Party Size",
      current: 3.6,
      previous: 3.5,
      change: 2.9,
      trend: "up",
    },
    {
      title: "No-Show Rate",
      current: 3.1,
      previous: 3.2,
      change: -3.1,
      trend: "down",
      suffix: "%",
    },
    {
      title: "Revenue",
      current: 24850,
      previous: 21200,
      change: 17.2,
      trend: "up",
      prefix: "$",
    },
    {
      title: "Repeat Guests",
      current: 156,
      previous: 132,
      change: 18.2,
      trend: "up",
    },
    {
      title: "Avg. Wait Time",
      current: 12,
      previous: 18,
      change: -33.3,
      trend: "down",
      suffix: " min",
    },
    {
      title: "Table Turnover",
      current: 2.8,
      previous: 2.4,
      change: 16.7,
      trend: "up",
      suffix: "x",
    },
  ];

  const daysCount = getDaysCount();
  const startDate = getStartDate();

  // Generate mock daily data based on selected date range
  const generateDailyData = useMemo(() => {
    const data: Record<string, { date: string; value: number }[]> = {};
    
    const baseValues: Record<string, { base: number; variance: number }> = {
      "Total Bookings": { base: 11, variance: 5 },
      "Cancellation Rate": { base: 8, variance: 4 },
      "Avg. Party Size": { base: 3.5, variance: 0.8 },
      "No-Show Rate": { base: 3, variance: 2 },
      "Revenue": { base: 800, variance: 300 },
      "Repeat Guests": { base: 5, variance: 3 },
      "Avg. Wait Time": { base: 12, variance: 6 },
      "Table Turnover": { base: 2.8, variance: 0.6 },
    };

    metrics.forEach((metric) => {
      const dailyData: { date: string; value: number }[] = [];
      const config = baseValues[metric.title];
      
      for (let i = 0; i < daysCount; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        
        // Generate value with some randomness and a slight upward trend
        const trendFactor = metric.trend === "up" ? i * 0.02 : -i * 0.01;
        const randomVariance = (Math.random() - 0.5) * 2 * config.variance;
        let value = config.base * (1 + trendFactor) + randomVariance;
        
        // Round appropriately based on metric type
        if (metric.title === "Avg. Party Size" || metric.title === "Table Turnover") {
          value = Math.round(value * 10) / 10;
        } else if (metric.suffix === "%") {
          value = Math.round(value * 10) / 10;
        } else {
          value = Math.round(value);
        }
        
        dailyData.push({ date: dateStr, value: Math.max(0, value) });
      }
      
      data[metric.title] = dailyData;
    });
    
    return data;
  }, [daysCount, startDate]);

  const selectedMetricData = metrics.find((m) => m.title === selectedMetric);
  const chartData = generateDailyData[selectedMetric] || [];

  const chartConfig = {
    value: {
      label: selectedMetric,
      color: "#10b981",
    },
  };

  // Mock data for bookings by day of week
  const bookingsByDay = [
    { day: "Mon", bookings: 42 },
    { day: "Tue", bookings: 38 },
    { day: "Wed", bookings: 45 },
    { day: "Thu", bookings: 52 },
    { day: "Fri", bookings: 78 },
    { day: "Sat", bookings: 95 },
    { day: "Sun", bookings: 62 },
  ];

  // Mock data for bookings by hour
  const bookingsByHour = [
    { hour: "11am", bookings: 8 },
    { hour: "12pm", bookings: 22 },
    { hour: "1pm", bookings: 35 },
    { hour: "2pm", bookings: 18 },
    { hour: "3pm", bookings: 12 },
    { hour: "4pm", bookings: 8 },
    { hour: "5pm", bookings: 15 },
    { hour: "6pm", bookings: 42 },
    { hour: "7pm", bookings: 58 },
    { hour: "8pm", bookings: 52 },
    { hour: "9pm", bookings: 38 },
    { hour: "10pm", bookings: 18 },
  ];

  const barChartConfig = {
    bookings: {
      label: "Bookings",
      color: "#10b981",
    },
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return TrendingUp;
    if (trend === "down") return TrendingDown;
    return Minus;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <div className="p-6 pt-2 h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flex items-center justify-end gap-3 mb-6">
        {dateRange === "custom_range" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal bg-white border-0 hover:shadow-md transition-shadow",
                  !customDateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange?.from ? (
                  customDateRange.to ? (
                    <>
                      {format(customDateRange.from, "LLL dd, y")} - {format(customDateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(customDateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={customDateRange?.from}
                selected={customDateRange}
                onSelect={setCustomDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px] bg-white border-0 hover:shadow-md focus:shadow-md transition-shadow focus:ring-0 [&>span]:font-medium">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="previous_month" className="font-medium">Previous Month</SelectItem>
            <SelectItem value="previous_week" className="font-medium">Previous Week</SelectItem>
            <SelectItem value="custom_range" className="font-medium">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {/* Left side - metrics */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const TrendIcon = getTrendIcon(metric.trend);
            const isSelected = selectedMetric === metric.title;
            return (
              <Card
                key={metric.title}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "bg-emerald-500 shadow-md border-emerald-500"
                    : "hover:shadow-md hover:border-primary/50"
                }`}
                onClick={() => setSelectedMetric(metric.title)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-medium ${isSelected ? "text-white" : "text-muted-foreground"}`}>
                    {metric.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold mb-1 ${isSelected ? "text-white" : "text-foreground"}`}>
                    {metric.prefix || ""}
                    {metric.current.toLocaleString()}
                    {metric.suffix || ""}
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${isSelected ? "text-white" : getTrendColor(metric.change)}`}>
                    <TrendIcon className="h-4 w-4" />
                    <span>{Math.abs(metric.change)}%</span>
                    <span className={isSelected ? "text-white/80" : "text-muted-foreground"}>vs last month</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right side - chart */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{selectedMetric}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Daily {selectedMetric.toLowerCase()} for the {dateRange === "previous_week" ? "last 7 days" : dateRange === "previous_month" ? "last 30 days" : `selected ${daysCount} days`}
            </p>
          </CardHeader>
          <CardContent className="h-[calc(100%-5rem)]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    if (selectedMetricData?.prefix === "$") return `$${value}`;
                    if (selectedMetricData?.suffix) return `${value}${selectedMetricData.suffix}`;
                    return value;
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => {
                        const prefix = selectedMetricData?.prefix || "";
                        const suffix = selectedMetricData?.suffix || "";
                        return `${prefix}${value}${suffix}`;
                      }}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom charts row */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Bookings by Day */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Day</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribution of bookings across the week
            </p>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ChartContainer config={barChartConfig} className="h-full w-full">
              <BarChart data={bookingsByDay} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${value} bookings`}
                    />
                  }
                />
                <Bar
                  dataKey="bookings"
                  fill="var(--color-bookings)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bookings by Hour */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Hour</CardTitle>
            <p className="text-sm text-muted-foreground">
              Peak booking times throughout the day
            </p>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ChartContainer config={barChartConfig} className="h-full w-full">
              <BarChart data={bookingsByHour} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${value} bookings`}
                    />
                  }
                />
                <Bar
                  dataKey="bookings"
                  fill="var(--color-bookings)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
