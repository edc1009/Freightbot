import {
    Zap, Edit3, Shield, FileText, Send, Truck, Building,
    DollarSign, Warehouse
} from 'lucide-react';

// Automation level configurations
export const AUTOMATION_LEVELS = {
    AUTO: { key: 'auto', label: 'Auto', color: 'var(--primary)', icon: Zap, desc: 'Agent handles automatically' },
    APPROVE: { key: 'approve', label: 'Approve', color: 'var(--chart-4)', icon: Edit3, desc: 'One-click approval needed' },
    MANUAL: { key: 'manual', label: 'Manual', color: 'var(--destructive)', icon: Shield, desc: 'Human handling required' }
};

// Playbook templates for different shipment types
export const PLAYBOOKS = {
    'import-fcl': {
        id: 'import-fcl',
        name: 'Import FCL – Standard',
        desc: 'Port → Door, full container',
        recommended: ['Import', 'FCL', 'Port to Door'],
        conditions: { direction: 'import', containerType: 'FCL', delivery: 'door' },
        steps: [
            { name: 'ISF Filing', default: 'approve', manualTriggers: ['dispute', 'penalty', 'late'] },
            { name: 'Await Carrier AN', default: 'auto' },
            { name: 'Truck Scheduling', default: 'approve', manualTriggers: ['surcharge', 'dispute'] },
            { name: 'Customs Coordination', default: 'auto', manualTriggers: ['hold', 'exam'] },
            { name: 'Warehouse Coordination', default: 'approve', manualTriggers: ['exception'] },
            { name: 'Shipment Delivery', default: 'auto' },
            { name: 'Billing & Collection', default: 'approve', manualTriggers: ['dispute', 'claim'] }
        ]
    },
    'import-lcl': {
        id: 'import-lcl',
        name: 'Import LCL – Standard',
        desc: 'CFS → Door, less than container',
        recommended: ['Import', 'LCL', 'CFS to Door'],
        conditions: { direction: 'import', containerType: 'LCL', delivery: 'door' },
        steps: [
            { name: 'ISF Filing', default: 'approve' },
            { name: 'Await Arrival Notice', default: 'auto' },
            { name: 'CFS Coordination', default: 'approve', manualTriggers: ['exception'] },
            { name: 'Customs Clearance', default: 'auto', manualTriggers: ['hold', 'exam'] },
            { name: 'Final Mile Delivery', default: 'approve', manualTriggers: ['surcharge'] },
            { name: 'Billing & Collection', default: 'approve', manualTriggers: ['dispute'] }
        ]
    },
    'free-hand': {
        id: 'free-hand',
        name: 'Free Hand Shipment',
        desc: 'Prepaid freight, release upon payment',
        recommended: ['LCL', 'Prepaid', 'Freight Collect'],
        conditions: { direction: 'any', containerType: 'LCL', paymentType: 'prepaid' },
        steps: [
            { name: 'Order Intake', default: 'auto' },
            { name: 'Await Carrier AN', default: 'auto' },
            { name: 'Send AN + Invoice', default: 'approve' },
            { name: 'Payment Collection', default: 'auto', manualTriggers: ['overdue', 'dispute'] },
            { name: 'Freight Release', default: 'manual' }
        ]
    }
};

// Step labels and icons
export const stepLabels = ['ISF Filing', 'Await Carrier AN', 'Truck Scheduling', 'Customs Coordination', 'Warehouse Coordination', 'Shipment Delivery', 'Billing & Collection'];
export const stepIcons = [FileText, Send, Truck, Building, DollarSign, Warehouse, FileText];

// Design system CSS
export const designSystemCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
  :root {
    --background: oklch(0.9911 0 0);
    --foreground: oklch(0.2046 0 0);
    --card: oklch(0.9911 0 0);
    --primary: oklch(0.8348 0.1302 160.9080);
    --primary-foreground: oklch(0.2626 0.0147 166.4589);
    --muted: oklch(0.9461 0 0);
    --muted-foreground: oklch(0.2435 0 0);
    --accent: oklch(0.9461 0 0);
    --accent-foreground: oklch(0.2435 0 0);
    --destructive: oklch(0.5523 0.1927 32.7272);
    --border: oklch(0.9037 0 0);
    --chart-2: oklch(0.6231 0.1880 259.8145);
    --chart-3: oklch(0.6231 0.1880 259.8145);
    --chart-4: oklch(0.7686 0.1647 70.0804);
    --chart-5: oklch(0.6959 0.1491 162.4796);
    --sidebar-foreground: oklch(0.5452 0 0);
  }
  * { font-family: 'Outfit', sans-serif; box-sizing: border-box; }
  html { overflow-y: scroll; }
  body { margin: 0; padding: 0; }
  input::placeholder { color: var(--sidebar-foreground); }
`;

// Animation keyframes CSS
export const animationCSS = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
`;
