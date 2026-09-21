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
            
            // Only close the stream if it's not RED_ESCROW_FROZEN.
            // RED_ESCROW_FROZEN will expect APPEAL_SUBMITTED_SUCCESS and RESOLUTION_OUTCOME events later.
            if (data.decision.decision_lane !== 'RED_ESCROW_FROZEN') {
              eventSourceRef.current?.close();
            } else {
              useCockpitStore.getState().setAppealStatus('QUEUED');
            }
          }

          // Sprint 5: Handle Async Appeal Events
          const type = (data as any).type;
          if (type === 'APPEAL_SUBMITTED_SUCCESS') {
            useCockpitStore.getState().setAppealStatus('SUBMITTED', (data as any).external_appeal_id);
          } else if (type === 'RESOLUTION_OUTCOME') {
            useCockpitStore.getState().setAppealStatus((data as any).outcome, (data as any).external_appeal_id);
            eventSourceRef.current?.close(); // Finally close stream when resolved
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
