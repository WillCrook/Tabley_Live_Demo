import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BookingCalendar from "@/components/BookingCalendar";

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

          {/* Recent Activity */}
          <Card className="cursor-pointer flex-1" onClick={() => navigate('/activity')}>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest booking updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: "2 min ago", text: "New booking for 4 guests at 8:00 PM" },
                  { time: "15 min ago", text: "Booking confirmed for Smith party" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="text-sm text-foreground">{activity.text}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Schedule */}
        <div className="flex flex-col min-h-0">
          <Card className="flex-1 cursor-pointer overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <BookingCalendar compact className="h-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
