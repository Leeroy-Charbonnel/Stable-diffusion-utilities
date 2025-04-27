import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { useApi } from '@/contexts/contextSD';
import { toast } from 'sonner';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';

const HEADER_HEIGHT = 60;
const TABS_HEIGHT = 40;
const SEARCH_HEIGHT = 60;


export function ModelsManager() {
  const {
    apiFS,
    isConnected,
    isLoading,
    labelsData,
    availableModels,
    availableLoras,
    updateLabelsData,
    refreshModelsAndLoras,
  } = useApi();

  const [searchModel, setSearchModel] = useState<string>('');
  const [searchLora, setSearchLora] = useState<string>('');
  const LIST_HEIGHT = `calc(100vh - ${HEADER_HEIGHT + TABS_HEIGHT + SEARCH_HEIGHT}px - 3rem)`;


  const saveLabelsData = async () => {
    try {
      await apiFS.saveLabelsData(labelsData);
    } catch (error) {
      console.error('Error saving labels data:', error);
      toast.error('Failed to save labels data');
    }
  };



  const callRefreshModelsAndLoras = async () => {
    if (!isConnected) {
      toast.error('Not connected to Stable Diffusion');
      return;
    }
    try {
      await refreshModelsAndLoras();
      toast.success('Models and LoRAs refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh LoRAs');
    }
  };

  const saveModelLabel = (modelName: string, modelLabel: string) => {
    const updatedLabels = [...labelsData.modelLabels];
    const existingIndex = updatedLabels.findIndex(item => item.name === modelName);
    updatedLabels[existingIndex].label = modelLabel;
    updateLabelsData({ ...labelsData, modelLabels: updatedLabels });
    saveLabelsData();
  };

  const saveLoraLabel = (loraName: string, lorasLabel: string) => {
    const updatedLabels = [...labelsData.lorasLabels];
    const existingIndex = updatedLabels.findIndex(item => item.name === loraName);
    updatedLabels[existingIndex].label = lorasLabel;
    updateLabelsData({ ...labelsData, lorasLabels: updatedLabels });
    saveLabelsData();
  };

  const filteredModels = labelsData.modelLabels.filter(model =>
    model.name.toLowerCase().includes(searchModel.toLowerCase()) || model.label.toLowerCase().includes(searchModel.toLowerCase())
  );

  const filteredLoras = labelsData.lorasLabels.filter(lora =>
    lora.name.toLowerCase().includes(searchLora.toLowerCase()) || lora.label.toLowerCase().includes(searchLora.toLowerCase())
  );

  const renderList = (type: 'models' | 'loras') => {
    const searchValue = type === 'models' ? searchModel : searchLora;
    const searchFunction = type === 'models' ? setSearchModel : setSearchLora;
    const saveFunction = type === 'models' ? saveModelLabel : saveLoraLabel;
    const list = type === 'models' ? filteredModels : filteredLoras;

    return (
      <div>
        <div style={{ height: `${SEARCH_HEIGHT}px` }} className="w-5/6 mx-auto">
          <div className="flex gap-2 justify-end">
            <Input
              placeholder={`Search ${type}...`}
              value={searchValue}
              onChange={(e) => searchFunction(e.target.value)}
              className="w-1/2"
            />
          </div>
          <Separator className="mt-2" />
        </div>

        <div
          className="w-5/6 mx-auto overflow-auto border rounded-md mt-2 p-4 space-y-2"
          style={{ maxHeight: LIST_HEIGHT }}
        >
          {list.map((model, index) => (
            <div key={model.name} className="grid grid-cols-12 gap-2  items-center">
              {/* Index column */}
              <Badge variant="secondary" className="col-span-1">
                {index + 1}
              </Badge>

              {/* Name column */}
              <div className="col-span-5 overflow-hidden">
                <div className="text-sm truncate" title={model.name}>
                  {model.name}
                </div>
              </div>

              {/* Label column */}
              <div className="col-span-6">
                <div className="flex gap-2">
                  <Input
                    value={model.label}
                    onChange={(e) => saveFunction(model.name, e.target.value)}
                    placeholder="Enter label"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container p-4">
      {/* Header with title and buttons - Fixed height */}
      <div style={{ height: `${HEADER_HEIGHT}px` }}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Models & LoRAs Manager</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshModelsAndLoras} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Models/LoRAs
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs section */}
      <Tabs defaultValue="models">
        {/* Tabs navigation - Fixed height */}
        <div style={{ height: `${TABS_HEIGHT}px` }}>
          <TabsList>
            <TabsTrigger value="models">Models [{availableModels.length}]</TabsTrigger>
            <TabsTrigger value="loras">LoRAs [{availableLoras.length}]</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content */}
        <TabsContent value="models" className="p-0 m-0">
          {renderList('models')}
        </TabsContent>

        <TabsContent value="loras" className="p-0 m-0">
          {renderList('loras')}
        </TabsContent>
      </Tabs>
    </div>
  );
}