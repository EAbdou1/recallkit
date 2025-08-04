import { AppSidebar } from "@/components/navigation/app-sidebar";
import Navbar from "@/components/navigation/Navbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { FC } from "react";
import { getNamespaces, getCurrentNamespace } from "@/actions/namespace";
import { NamespaceMonitor } from "@/components/providers/namespace-monitor";

interface layoutProps {
  children: React.ReactNode;
}

const layout: FC<layoutProps> = async ({ children }) => {
  const namespaces = await getNamespaces();
  const currentNamespace = await getCurrentNamespace();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <NamespaceMonitor>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <main className="flex h-full flex-col overflow-hidden">
              <Navbar
                namespaces={namespaces}
                currentNamespace={currentNamespace || namespaces[0]?.name || ""}
              />

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </NamespaceMonitor>
    </div>
  );
};

export default layout;
