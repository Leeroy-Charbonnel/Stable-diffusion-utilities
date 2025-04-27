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
import { Alert, AlertTitle } from "@/components/ui/alert";
import { ListChecks, Image, CheckCircle, AlertCircle, BrainCog, Database } from "lucide-react";
import { useApi } from "@/contexts/contextSD";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
    activeTab: "prompts" | "ai" | "images" | "models";
    setActiveTab: (tab: "prompts" | "ai" | "images" | "models") => void;
    newImageNumber: number;
}

function SidebarInner({ activeTab, setActiveTab, newImageNumber }: SidebarProps) {
    const { isConnected } = useApi();
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
        },
        {
            title: "Images",
            id: "images",
            icon: Image,
            badge: newImageNumber > 0 ? newImageNumber : null,
        },
        {
            title: "Models",
            id: "models",
            icon: Database,
        },
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
                                        onClick={() => setActiveTab(item.id as "prompts" | "ai" | "images" | "models")}
                                        data-tab={item.id}
                                    >
                                        <div>
                                            <item.icon />
                                            <span>{item.title}</span>
                                            {item.badge && <Badge className="ml-auto">{item.badge}</Badge>}
                                        </div>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <div className="flex">
                    {!isConnected && open && (
                        <Alert className={`flex p-2 bg-destructive/20 ${open ? '' : 'justify-center b-0'}`}>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Not Connected</AlertTitle>
                        </Alert>
                    )
                    }
                </div>
            </SidebarFooter>

        </>
    );
}

export function AppSidebar({ activeTab, setActiveTab, newImageNumber }: SidebarProps) {
    return (
        <SidebarProvider className="w-fit">
            <Sidebar collapsible="icon">
                <SidebarInner
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    newImageNumber={newImageNumber}
                />
            </Sidebar>
        </SidebarProvider>
    );
}