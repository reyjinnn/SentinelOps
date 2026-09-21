import { create } from 'zustand';

export interface LogEntry {
  timestamp: string;
  step: string;
  message: string;
  level?: string;
  decision?: any;
}

export interface FinalDecision {
  decision_lane: 'GREEN_AUTO_REFUND' | 'RED_ESCROW_FROZEN' | 'YELLOW_ESCALATE_HUMAN';
  triggered_rule: string;
  loss_prevented_idr: number;
  dossier?: string;
  external_appeal_id?: string;
  appeal_status?: 'QUEUED' | 'SUBMITTED' | 'WON' | 'LOST';
}

interface CockpitState {
  selectedMarketplace: string;
  activeScenarioId: string;
  payloadJson: string;
  isEvaluating: boolean;
  streamingLogs: LogEntry[];
  finalDecision: FinalDecision | null;
  lossPreventedIdr: number;
  
  setMarketplace: (mp: string) => void;
  setScenario: (scenarioId: string, payload: string) => void;
  setPayloadJson: (json: string) => void;
  setIsEvaluating: (evaluating: boolean) => void;
  addLog: (log: LogEntry) => void;
  setFinalDecision: (decision: FinalDecision) => void;
  setAppealStatus: (status: 'QUEUED' | 'SUBMITTED' | 'WON' | 'LOST', externalAppealId?: string) => void;
  resetAudit: () => void;
}

export const useCockpitStore = create<CockpitState>((set) => ({
  selectedMarketplace: 'ALL',
  activeScenarioId: 'case-a',
  payloadJson: '',
  isEvaluating: false,
  streamingLogs: [],
  finalDecision: null,
  lossPreventedIdr: 0,
  
  setMarketplace: (mp) => set({ selectedMarketplace: mp }),
  setScenario: (id, payload) => set({ activeScenarioId: id, payloadJson: payload }),
  setPayloadJson: (json) => set({ payloadJson: json }),
  setIsEvaluating: (val) => set({ isEvaluating: val }),
  addLog: (log) => set((state) => ({ streamingLogs: [...state.streamingLogs, log] })),
  setFinalDecision: (decision) => set({ finalDecision: decision, lossPreventedIdr: decision.loss_prevented_idr }),
  setAppealStatus: (status, externalAppealId) => set((state) => ({
    finalDecision: state.finalDecision ? {
      ...state.finalDecision,
      appeal_status: status,
      ...(externalAppealId && { external_appeal_id: externalAppealId })
    } : null
  })),
  resetAudit: () => set({ streamingLogs: [], finalDecision: null, lossPreventedIdr: 0, isEvaluating: false })
}));
