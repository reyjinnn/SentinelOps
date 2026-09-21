import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useCockpitStore } from '../../stores/useCockpitStore';
import { ShieldCheck, ShieldAlert, AlertTriangle, Copy, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

export function PanelThreeDecisionRoom() {
  const { finalDecision } = useCockpitStore();

  const getStatusColor = (lane: string) => {
    if (lane === 'GREEN_AUTO_REFUND') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (lane === 'RED_ESCROW_FROZEN') return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  };

  const getStatusIcon = (lane: string) => {
    if (lane === 'GREEN_AUTO_REFUND') return <ShieldCheck className="h-8 w-8 text-emerald-500" />;
    if (lane === 'RED_ESCROW_FROZEN') return <ShieldAlert className="h-8 w-8 text-rose-500" />;
    return <AlertTriangle className="h-8 w-8 text-amber-500" />;
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const copyToClipboard = () => {
    if (finalDecision?.dossier) {
      navigator.clipboard.writeText(finalDecision.dossier);
      alert('Dossier copied to clipboard!');
    }
  };

  if (!finalDecision) {
    return (
      <Card className="h-full bg-zinc-900 border-zinc-800 flex items-center justify-center">
        <div className="text-zinc-500 flex flex-col items-center gap-2">
          <ShieldCheck className="h-12 w-12 opacity-20" />
          <p>Awaiting Final Decision...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-zinc-900 border-zinc-800 flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-zinc-100">Decision Room</CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4 flex-grow overflow-hidden">
        
        {/* Top Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border flex flex-col gap-2 ${getStatusColor(finalDecision.decision_lane)}`}>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Final Posture</span>
              {getStatusIcon(finalDecision.decision_lane)}
            </div>
            <span className="text-lg font-bold mt-2">{finalDecision.decision_lane.replace(/_/g, ' ')}</span>
            <span className="text-xs opacity-70">Rule: {finalDecision.triggered_rule}</span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {finalDecision.appeal_status === 'WON' ? 'Escrow Recovered' : 'Loss Prevented'}
            </span>
            <span className="text-2xl font-bold text-emerald-400">{formatIDR(finalDecision.loss_prevented_idr)}</span>
          </div>
        </div>

        {/* Sprint 5: Appeal Status Timeline */}
        {finalDecision.decision_lane === 'RED_ESCROW_FROZEN' && (
          <div className="flex flex-col gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Appeal Status Timeline</span>
              {finalDecision.external_appeal_id && (
                <span className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-1 rounded">
                  ID: {finalDecision.external_appeal_id}
                </span>
              )}
            </div>
            <div className="flex items-center text-sm gap-2 mt-2">
              <span className={`px-2 py-1 rounded-md text-xs font-bold ${finalDecision.appeal_status ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                1. EVALUATED
              </span>
              <span className="text-zinc-600">→</span>
              <span className={`px-2 py-1 rounded-md text-xs font-bold ${(finalDecision.appeal_status === 'SUBMITTED' || finalDecision.appeal_status === 'WON' || finalDecision.appeal_status === 'LOST') ? 'bg-sky-500/20 text-sky-400' : (finalDecision.appeal_status === 'QUEUED' ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-zinc-800 text-zinc-500')}`}>
                2. {finalDecision.appeal_status === 'QUEUED' ? 'AUTO-FILING...' : 'SUBMITTED'}
              </span>
              <span className="text-zinc-600">→</span>
              <span className={`px-2 py-1 rounded-md text-xs font-bold ${finalDecision.appeal_status === 'WON' ? 'bg-emerald-500/20 text-emerald-400' : finalDecision.appeal_status === 'LOST' ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-500'}`}>
                3. {finalDecision.appeal_status === 'WON' ? 'WON (FUNDS RECOVERED)' : finalDecision.appeal_status === 'LOST' ? 'LOST' : 'UNDER REVIEW'}
              </span>
            </div>
          </div>
        )}

        {/* Dossier Section */}
        {finalDecision.dossier && (
          <div className="flex flex-col flex-grow border border-zinc-800 rounded-xl overflow-hidden mt-2">
            <div className="bg-zinc-950 p-3 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-300">Legal Arbitration Dossier (Markdown)</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-100" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-100">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-grow bg-zinc-950 p-4">
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-400 prose-strong:text-zinc-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {finalDecision.dossier}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
