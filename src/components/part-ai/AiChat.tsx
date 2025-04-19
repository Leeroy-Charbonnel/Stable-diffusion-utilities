import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiChatConversation } from './AiChatConversation';
import { AiSettings } from './AiSettings';

export function AiChat() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <AiChatConversation />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <AiSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}