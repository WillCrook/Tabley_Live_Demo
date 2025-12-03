import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BookingCalendar from "@/components/BookingCalendar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = [
    {
      title: "Current Guests",
      value: "52",
      description: "In restaurant now",
      icon: Users,
    },
    {
      title: "Current Bookings",
      value: "18",
      description: "Active reservations",
      icon: Calendar,
    },
    {
      title: "Total Guests",
      value: "86",
      description: "Across all bookings",
      icon: TrendingUp,
    },
    {
      title: "Today's Bookings",
      value: "24",
      description: "+12% from yesterday",
      icon: Clock,
    },
  ];

  return (
    <div className="p-6 pt-2 h-[calc(100vh-100px)] overflow-hidden flex flex-col">
      <div className="grid gap-6 lg:grid-cols-[45%_1fr] flex-1 min-h-0">
        {/* Left Column: Stats and Recent Activity */}
        <div className="space-y-6 flex flex-col">
          {/* Stats Grid (2x2) */}
          <div className="grid gap-6 md:grid-cols-2">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="cursor-pointer group transition-all duration-200"
                  onClick={() => navigate('/analytics')}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-125" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bookings by Hour */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Bookings by Hour</CardTitle>
              <CardDescription>Peak booking times throughout the day</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ChartContainer config={{
                bookings: {
                  label: "Bookings",
                  color: "#10b981",
                },
              }} className="h-full w-full">
                <BarChart data={[
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
                ]} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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

        {/* Right Column: Schedule */}
        <div className="flex flex-col min-h-0">
          <BookingCalendar compact dashboard className="h-full" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
