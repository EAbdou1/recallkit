"use client";
import { FC } from "react";
import { Namespace } from "@/types/namespace";
import ThemeSwitcher from "./ThemeSwitcher";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import NamespaceMenu from "../namespace/NamespaceMenu";

interface NavbarProps {
  namespaces: Namespace[];
  currentNamespace: string;
}

const Navbar: FC<NavbarProps> = ({ namespaces, currentNamespace }) => {
  return (
    <div className="flex justify-between items-center py-2 px-4 border-b ">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <NamespaceMenu data={namespaces} currentNamespace={currentNamespace} />
      </div>
      <div className="mr-2">
        <ThemeSwitcher />
      </div>
    </div>
  );
};

export default Navbar;
