// Initial shipments data - empty by default, populated by Agent
export const initialShipments = [];

// Test email shipments - for reference only
export const testEmailShipments = [
    { id: 'SHP-009', reference: 'COSU6789012', customer: 'Smart Home Co', origin: 'Shanghai', destination: 'Los Angeles', status: 'new', step: 1, eta: '2025-01-20', alerts: 0, vessel: 'COSCO SHIPPING VENUS', bl: 'COSU4901234567', isfFiled: false, playbook: 'import-fcl', pendingActions: [], suggestReason: 'Detected: ISF requirement, FCL, US destination' },
    { id: 'SHP-010', reference: 'MAEU7890123', customer: 'Auto Parts Direct', origin: 'Yokohama', destination: 'Long Beach', status: 'new', step: 1, eta: '2025-01-22', alerts: 0, vessel: 'MAERSK EDINBURGH', bl: 'MAEU5012345678', isfFiled: false, playbook: 'import-lcl', pendingActions: [], suggestReason: 'Detected: CFS consolidation, LCL shipment' },
];

// Initial activities
export const initialActivities = [];

// Initial messages
export const initialMessages = [];

// Auto-handled items for today - will be populated by Agent activity
export const autoHandledItems = [];
