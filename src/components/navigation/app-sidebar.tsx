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
          <Link href="/dashboard" className="px-2 pt-2">
            <span className="truncate font-bold  text-lg text-foreground">
              RecallKit
            </span>
          </Link>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="mt-4">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
