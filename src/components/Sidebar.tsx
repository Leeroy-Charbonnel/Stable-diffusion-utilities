import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListChecks, Image, CheckCircle, AlertCircle, BrainCog, } from "lucide-react";
import { useApi } from "@/contexts/ApiContext";

interface SidebarProps {
    activeTab: "prompts" | "ai" | "images";
    setActiveTab: (tab: "prompts" | "ai" | "images") => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
    const { isConnected, error: apiError } = useApi();

    return (
        <div className="w-64 border-r border-border h-screen flex flex-col">
            <div className="p-4 border-b border-border">
                <h1 className="text-xl font-bold">SD Utilities</h1>
                <p className="text-xs text-muted-foreground">Stable Diffusion Tools</p>
            </div>

            <nav className="flex flex-col p-2 gap-1">
                <Button variant={activeTab === "prompts" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("prompts")} data-tab="prompts" >
                    <ListChecks className="mr-2 h-4 w-4" /> Prompts
                </Button>


                <Button variant={activeTab === "ai" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("ai")} data-tab="ai">
                    <BrainCog className="mr-2 h-4 w-4" />AI
                </Button>

                <Button variant={activeTab === "images" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("images")} data-tab="images" >
                    <Image className="mr-2 h-4 w-4" />Images
                </Button>

            </nav>

            <div className="mt-auto p-2">
                {/* Connection Status */}
                {isConnected ? (
                    <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Connected</AlertTitle>
                        <AlertDescription>
                            Successfully connected to Stable Diffusion API.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Alert className="mb-4 bg-destructive/10 text-destructive dark:bg-destructive/20">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Not Connected</AlertTitle>
                        <AlertDescription>
                            {apiError ||
                                "Not connected to the Stable Diffusion API. Check your connection settings."}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div >
    );
}
