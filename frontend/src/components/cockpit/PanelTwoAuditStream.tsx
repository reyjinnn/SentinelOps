import { useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useCockpitStore } from '../../stores/useCockpitStore';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Terminal, Activity, CheckCircle2 } from 'lucide-react';

export function PanelTwoAuditStream() {
  const { streamingLogs, isEvaluating } = useCockpitStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamingLogs]);

  // Extract latest metrics from logs for badges
  const aiLog = streamingLogs.find(l => l.step === 'VISION_AI');
  const telLog = streamingLogs.find(l => l.step === 'TELEMETRY_SYNC');

  const riskScoreMatch = aiLog?.message.match(/Fraud Risk: (\d+)/);
  const riskScore = riskScoreMatch ? parseInt(riskScoreMatch[1], 10) : null;

  const deltaMatch = telLog?.message.match(/Delta: (\d+g)/);
  const devMatch = telLog?.message.match(/Dev: ([\d.]+%)/);

  return (
    <Card className="h-full bg-zinc-900 border-zinc-800 flex flex-col">
      <CardHeader className="border-b border-zinc-800 pb-4">
        <CardTitle className="text-zinc-100 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-400" />
            <span>Live Forensic Audit Stream</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-mono">
              {isEvaluating ? 'STREAMING' : 'IDLE'}
            </span>
            <span className="relative flex h-3 w-3">
              {isEvaluating && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isEvaluating ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex-grow flex flex-col bg-zinc-950">
        <ScrollArea className="flex-grow p-4 font-mono text-xs" ref={scrollRef}>
          {streamingLogs.length === 0 && !isEvaluating && (
            <div className="text-zinc-600 italic">Waiting for incoming webhook events...</div>
          )}
          {streamingLogs.map((log, i) => (
            <div key={i} className="mb-2 leading-relaxed">
              <span className="text-zinc-500">[{new Date(log.timestamp).toISOString().split('T')[1].replace('Z', '')}]</span>{' '}
              <span className="text-sky-400 font-bold">[{log.step}]</span>{' '}
              <span className={log.step === 'DECISION_FINAL' ? 'text-emerald-400 font-bold' : 'text-zinc-300'}>
                {log.message}
              </span>
            </div>
          ))}
        </ScrollArea>

        <div className="border-t border-zinc-800 p-4 bg-zinc-900 flex gap-3 flex-wrap">
          <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-zinc-300 gap-1">
            <Activity className="h-3 w-3 text-sky-400" /> 
            Weight Dev: {devMatch ? `${deltaMatch?.[1]} (${devMatch?.[1]})` : 'N/A'}
          </Badge>
          <Badge variant="outline" className={`bg-zinc-950 gap-1 ${riskScore && riskScore > 50 ? 'border-rose-500/50 text-rose-400' : 'border-zinc-800 text-zinc-300'}`}>
            <CheckCircle2 className={`h-3 w-3 ${riskScore && riskScore > 50 ? 'text-rose-500' : 'text-emerald-500'}`} /> 
            Risk Score: {riskScore !== null ? `${riskScore}/100` : 'N/A'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
