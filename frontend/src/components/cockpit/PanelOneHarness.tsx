import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { useCockpitStore } from '../../stores/useCockpitStore';
import { mockScenarios } from '../../data/mockScenarios';
import { Loader2 } from 'lucide-react';

export function PanelOneHarness({ onTrigger }: { onTrigger: (disputeId: string) => void }) {
  const { 
    selectedMarketplace, 
    setMarketplace, 
    activeScenarioId, 
    setScenario, 
    payloadJson, 
    setPayloadJson,
    isEvaluating,
    setIsEvaluating,
    resetAudit
  } = useCockpitStore();

  const [error, setError] = useState('');

  useEffect(() => {
    // Initial payload population
    if (!payloadJson) {
      const defaultScenario = mockScenarios.find(s => s.id === activeScenarioId);
      if (defaultScenario) {
        setScenario(defaultScenario.id, defaultScenario.payload);
      }
    }
  }, []);

  const handleScenarioChange = (id: string) => {
    const scenario = mockScenarios.find(s => s.id === id);
    if (scenario) {
      setScenario(scenario.id, scenario.payload);
      setError('');
    }
  };

  const handleTrigger = async () => {
    try {
      setError('');
      setIsEvaluating(true);
      resetAudit();

      const parsed = JSON.parse(payloadJson);
      const disputeId = parsed.event_id;
      
      onTrigger(disputeId); // Pass dispute ID to start SSE listening immediately

      const response = await fetch(`http://localhost:9000/api/v1/disputes/evaluate?source=${selectedMarketplace}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant-123',
          'x-signature': 'MOCK_SIGNATURE_SKIPPED_IN_LOCAL' // Webhook signature for local testing
        },
        body: payloadJson
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

    } catch (err: any) {
      setError(err.message || 'Invalid JSON or Request Failed');
      setIsEvaluating(false);
    }
  };

  return (
    <Card className="h-full bg-zinc-900 border-zinc-800 flex flex-col">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center justify-between">
          <span>Event Harness</span>
          {isEvaluating && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-grow">
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium">Marketplace Source</label>
          <Select value={selectedMarketplace} onValueChange={setMarketplace}>
            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300">
              <SelectValue placeholder="Select Marketplace" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
              <SelectItem value="ALL">All (Generic)</SelectItem>
              <SelectItem value="SHOPEE">Shopee</SelectItem>
              <SelectItem value="TIKTOK_SHOP">TikTok Shop</SelectItem>
              <SelectItem value="TOKOPEDIA">Tokopedia</SelectItem>
              <SelectItem value="SHOPIFY">Shopify</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium">Test Scenario</label>
          <Select value={activeScenarioId} onValueChange={handleScenarioChange}>
            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300">
              <SelectValue placeholder="Select a scenario" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
              {mockScenarios.map(scen => (
                <SelectItem key={scen.id} value={scen.id}>{scen.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-grow flex flex-col">
          <label className="text-xs text-zinc-400 font-medium">Payload (JSON)</label>
          <Textarea 
            className="flex-grow bg-zinc-950 border-zinc-800 text-zinc-300 font-mono text-xs resize-none"
            value={payloadJson}
            onChange={(e) => setPayloadJson(e.target.value)}
          />
        </div>

        {error && <div className="text-xs text-rose-500 font-medium">{error}</div>}

        <Button 
          onClick={handleTrigger} 
          disabled={isEvaluating}
          className="w-full bg-zinc-100 hover:bg-zinc-300 text-zinc-900 font-bold"
        >
          {isEvaluating ? 'EVALUATING...' : 'TRIGGER WEBHOOK EVALUATION'}
        </Button>
      </CardContent>
    </Card>
  );
}
