"use client";

import { FC, useTransition } from "react";
import { Namespace } from "@/types/namespace";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Folder } from "lucide-react";
import CreateNamespace from "./CreateNamespace";
import { switchNamespace } from "@/actions/setNamespace";

interface NamespaceMenuProps {
  data: Namespace[];
  currentNamespace: string;
}

const NamespaceMenu: FC<NamespaceMenuProps> = ({ data, currentNamespace }) => {
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (namespaceName: string) => {
    startTransition(() => {
      switchNamespace(namespaceName);
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Folder className="h-4 w-4" />
          <span>{currentNamespace || "No Namespace"}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Your Namespaces</h4>
            <CreateNamespace />
          </div>
          <div className="space-y-2">
            {data.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No namespaces yet. Create your first one!
              </p>
            ) : (
              data.map((namespace) => {
                const isCurrent = currentNamespace === namespace.name;
                return (
                  <form
                    key={namespace.name}
                    action={() => handleSwitch(namespace.name)}
                  >
                    <button
                      type="submit"
                      className={`flex items-center justify-between w-full p-2 rounded-md hover:bg-accent transition-colors ${
                        isCurrent ? "bg-primary/10  border border-primary" : ""
                      }`}
                      disabled={isCurrent || isPending}
                    >
                      <div
                        className={`flex items-center gap-2 ${
                          isCurrent
                            ? "text-primary font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Folder
                          className={`h-4 w-4 ${
                            isCurrent ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          {namespace.name}
                        </span>
                      </div>
                    </button>
                  </form>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NamespaceMenu;
