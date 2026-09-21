import { useState } from 'react';
import { PanelOneHarness } from './components/cockpit/PanelOneHarness';
import { PanelTwoAuditStream } from './components/cockpit/PanelTwoAuditStream';
import { PanelThreeDecisionRoom } from './components/cockpit/PanelThreeDecisionRoom';
import { useDisputeStream } from './hooks/useDisputeStream';
import { ShieldCheck } from 'lucide-react';

function App() {
  const [activeDisputeId, setActiveDisputeId] = useState<string | null>(null);

  // Initialize SSE Hook
  useDisputeStream(activeDisputeId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 flex flex-col h-screen overflow-hidden font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-zinc-900 mb-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-500" />
          <h1 className="text-xl font-bold tracking-tight">SentinelOps AI Cockpit</h1>
        </div>
        <div className="text-xs font-mono text-zinc-500 flex gap-4">
          <span>PORT: 5173</span>
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            SYSTEM ONLINE
          </span>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <main className="grid grid-cols-12 gap-4 flex-grow overflow-hidden">
        
        {/* Panel 1: Event Harness (Left) */}
        <section className="col-span-3 h-full">
          <PanelOneHarness onTrigger={setActiveDisputeId} />
        </section>

        {/* Panel 2: Live Audit Stream (Middle) */}
        <section className="col-span-4 h-full">
          <PanelTwoAuditStream />
        </section>

        {/* Panel 3: Decision Room (Right) */}
        <section className="col-span-5 h-full">
          <PanelThreeDecisionRoom />
        </section>

      </main>
    </div>
  );
}

export default App;
