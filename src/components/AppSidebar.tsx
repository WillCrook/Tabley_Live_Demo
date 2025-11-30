import { LayoutDashboard, Calendar, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import joyaLogo from "@/assets/joya-logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Bookings", url: "/bookings", icon: Calendar },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        {/* Profile Section - at top with margin */}
        <div className="p-4 mt-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={joyaLogo} 
                alt="Joya" 
                className="w-full h-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="font-semibold text-sm text-foreground truncate">
                  Joya
                </h2>
              </div>
            )}
          </div>
        </div>

        {/* New Booking Button */}
        {!isCollapsed && (
          <div className="px-4 mb-4">
            <button 
              className="w-full px-4 py-4 rounded-lg text-white font-medium transition-opacity hover:opacity-90 flex items-center gap-3"
              style={{ backgroundColor: '#442553' }}
            >
              <span className="text-3xl leading-none">+</span>
              <div className="text-left text-sm">
                <div>Add New</div>
                <div>Booking</div>
              </div>
            </button>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
