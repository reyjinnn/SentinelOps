import { useEffect, useRef } from 'react';
import { useCockpitStore, type LogEntry } from '../stores/useCockpitStore';

export function useDisputeStream(disputeId: string | null) {
  const { addLog, setIsEvaluating, setFinalDecision } = useCockpitStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!disputeId) return;

    const connect = () => {
      // Connect to Fastify SSE
      eventSourceRef.current = new EventSource(`http://localhost:9000/api/v1/disputes/${disputeId}/stream`);

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as LogEntry;
          addLog(data);
          
          if (data.step === 'DECISION_FINAL' && data.decision) {
            setFinalDecision(data.decision);
            setIsEvaluating(false);
            eventSourceRef.current?.close();
          }
        } catch (e) {
          // heartbeat or non-json message
          console.log("SSE Message:", event.data);
        }
      };

      eventSourceRef.current.onerror = (err) => {
        console.error("SSE Error:", err);
        eventSourceRef.current?.close();
        setIsEvaluating(false);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [disputeId, addLog, setIsEvaluating, setFinalDecision]);

  return null;
}
