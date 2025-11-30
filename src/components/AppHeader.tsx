import { LayoutDashboard, Calendar, BarChart3, Activity, Plus, Settings as SettingsIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navigationItems = [{
  title: "New Booking",
  url: "/new-booking",
  icon: Plus
}, {
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard
}, {
  title: "Bookings",
  url: "/bookings",
  icon: Calendar
}, {
  title: "Analytics",
  url: "/analytics",
  icon: BarChart3
}, {
  title: "Activity",
  url: "/activity",
  icon: Activity
}, {
  title: "Settings",
  url: "/settings",
  icon: SettingsIcon
}];

export function AppHeader() {
  return (
    <header className="flex items-center justify-between ml-6 mr-12 py-8">
      {/* Left - Logos Section */}
      <div className="flex items-center gap-3">
        {/* Tabley Logo - Text Only with green period */}
        <div className="flex items-center">
          <h2 className="font-bold text-2xl tracking-tight" style={{ fontFamily: 'Inter, sans-serif', color: '#18181b' }}>
            Tabley<span style={{ color: '#059669' }}>.</span>
          </h2>
        </div>
      </div>

      {/* Right - Navigation Section */}
      <nav className="flex items-center gap-4">
        {navigationItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end
          >
            {({ isActive }) => (
              <div className="group flex items-center px-3 py-2 rounded-md cursor-pointer">
                <div className={`flex items-center justify-center transition-all duration-300 ease-in-out overflow-hidden ${isActive ? 'w-5 opacity-100 mr-2' : 'w-0 opacity-0 mr-0 group-hover:w-5 group-hover:opacity-100 group-hover:mr-2'}`}>
                  <item.icon
                    className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-[#52525b] group-hover:text-emerald-500'}`}
                  />
                </div>
                <span className={`text-lg font-medium ${isActive ? 'text-black' : 'text-[#52525b]'}`}>
                  {item.title}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}