import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiChatConversation } from './AiChatConversation';
import { AiCivitaiExtractor } from './AiCivitaiExtractor';
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
          <TabsTrigger value="extract">Extract from Civitai</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <AiChatConversation />
        </TabsContent>

        {/* Extract from Civitai Tab */}
        <TabsContent value="extract" className="space-y-4">
          <AiCivitaiExtractor />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <AiSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}