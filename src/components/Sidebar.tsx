// src/components/Sidebar.tsx
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { Tab } from "@/types";
import { ListChecks, Image, BrainCog, Database } from "lucide-react";

interface SidebarProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
}

function SidebarInner({ activeTab, setActiveTab }: SidebarProps) {
    const { open } = useSidebar();

    //Navigation items
    const navItems = [
        {
            title: "Prompts",
            id: "prompts",
            icon: ListChecks,
        },
        {
            title: "AI",
            id: "ai",
            icon: BrainCog,
        }
    ];

    return (
        <>
            <SidebarHeader className="flex flex-row items-center justify-between">
                <div className={`p-4 border-b border-border overflow-hidden transition-width text-nowrap ${open ? "block" : "hidden"}`}>
                    <h1 className="text-xl font-bold">SD Utilities</h1>
                    <p className="text-xs text-muted-foreground">Stable Diffusion Tools</p>
                </div>
                <SidebarTrigger />
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton
                                        asChild
                                        className={`w-full justify-start ${activeTab === item.id ? "bg-primary text-primary-foreground" : ""}`}
                                        onClick={() => setActiveTab(item.id as Tab)}
                                        data-tab={item.id}
                                    >
                                        <div>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </div>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </>
    );
}

export function AppSidebar({ activeTab, setActiveTab }: SidebarProps) {
    return (
        <SidebarProvider className="w-fit">
            <Sidebar collapsible="icon">
                <SidebarInner
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </Sidebar>
        </SidebarProvider>
    );
}