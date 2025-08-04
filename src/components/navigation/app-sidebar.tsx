"use client";

import * as React from "react";
import { BookOpen, Home, MemoryStick, Terminal } from "lucide-react";

import { NavMain } from "@/components/navigation/nav-main";
import { NavUser } from "@/components/navigation/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const data = {
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
        activeUrl: "/dashboard",
      },
      {
        title: "Memories",
        url: "/dashboard/memories",
        icon: MemoryStick,
        activeUrl: "/dashboard/memories",
      },

      {
        title: "Demo",
        url: "/dashboard/demo",
        icon: BookOpen,
        activeUrl: "/dashboard/demo",
      },
      {
        title: "Documentation",
        url: "/dashboard/documentation",
        icon: BookOpen,
        activeUrl: "/dashboard/documentation",
      },
      {
        title: "API Keys",
        url: "/dashboard/api-keys",
        icon: Terminal,
        activeUrl: "/dashboard/api-keys",
      },
    ],
  };
  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">RecallKit</span>
                  <span className="truncate text-xs">Powered by Redis</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
