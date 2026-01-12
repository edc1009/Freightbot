import React, { useState } from 'react';
import { 
  Ship, Package, Bell, MessageSquare, Settings, Clock, Mail, 
  ChevronRight, AlertTriangle, CheckCircle, Loader, X,
  FastForward, Calendar, User, Building, Truck, FileText,
  DollarSign, Warehouse, Send, RefreshCw, Search, ArrowLeft,
  Inbox, ArrowUpRight, ArrowDownLeft, ChevronDown, Shield,
  Edit3, Zap, AlertCircle, Check, ExternalLink, Plus, Users
} from 'lucide-react';

const AUTOMATION_LEVELS = {
  AUTO: { key: 'auto', label: 'Auto', color: 'var(--primary)', icon: Zap, desc: 'Agent handles automatically' },
  APPROVE: { key: 'approve', label: 'Approve', color: 'var(--chart-4)', icon: Edit3, desc: 'One-click approval needed' },
  MANUAL: { key: 'manual', label: 'Manual', color: 'var(--destructive)', icon: Shield, desc: 'Human handling required' }
};

const PLAYBOOKS = {
  'import-fcl': {
    id: 'import-fcl',
    name: 'Import FCL – Standard',
    desc: 'Port → Door, full container',
    recommended: ['Import', 'FCL', 'Port to Door'],
    conditions: { direction: 'import', containerType: 'FCL', delivery: 'door' },
    steps: [
      { name: 'Docs Intake', default: 'auto' },
      { name: 'ISF Coordination', default: 'approve', manualTriggers: ['dispute', 'penalty', 'late'] },
      { name: 'Ocean Tracking', default: 'auto' },
      { name: 'Arrival Notice', default: 'approve' },
      { name: 'Truck Scheduling', default: 'approve', manualTriggers: ['surcharge', 'dispute'] },
      { name: 'Customs Clearance', default: 'auto', manualTriggers: ['hold', 'exam'] },
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
      { name: 'Docs Intake', default: 'auto' },
      { name: 'ISF Coordination', default: 'approve' },
      { name: 'Ocean Tracking', default: 'auto' },
      { name: 'CFS Coordination', default: 'approve', manualTriggers: ['exception'] },
      { name: 'Customs Clearance', default: 'auto', manualTriggers: ['hold', 'exam'] },
      { name: 'Final Mile Delivery', default: 'approve', manualTriggers: ['surcharge'] },
      { name: 'Billing & Collection', default: 'approve', manualTriggers: ['dispute'] }
    ]
  },
  'export-fcl': {
    id: 'export-fcl',
    name: 'Export FCL – Standard',
    desc: 'Door → Port → Vessel',
    recommended: ['Export', 'FCL', 'Door to Port'],
    conditions: { direction: 'export', containerType: 'FCL', delivery: 'port' },
    steps: [
      { name: 'Booking & SI', default: 'approve' },
      { name: 'Empty Pickup', default: 'approve' },
      { name: 'CY Cutoff Reminder', default: 'auto' },
      { name: 'Gate-in Confirmation', default: 'auto' },
      { name: 'Departure Notice', default: 'auto' },
      { name: 'Exception Handling', default: 'manual' },
      { name: 'Billing', default: 'approve' }
    ]
  },
  'import-ddp': {
    id: 'import-ddp',
    name: 'Import DDP – Door to Door',
    desc: 'High control, high risk',
    recommended: ['Import', 'DDP', 'Full Service'],
    conditions: { direction: 'import', containerType: 'Any', delivery: 'ddp', risk: 'high' },
    steps: [
      { name: 'Docs Intake', default: 'auto' },
      { name: 'Customs & Duty Planning', default: 'approve' },
      { name: 'Duty Payment Auth', default: 'manual' },
      { name: 'Last-mile Scheduling', default: 'approve', manualTriggers: ['claim', 'surcharge'] },
      { name: 'Delivery Confirmation', default: 'auto' },
      { name: 'Claims & Exceptions', default: 'manual' },
      { name: 'Billing', default: 'manual' }
    ]
  },
  'broker-led': {
    id: 'broker-led',
    name: 'Broker-led Import',
    desc: 'Forwarder coordinates, broker clears',
    recommended: ['Import', 'Broker Handles Customs'],
    conditions: { direction: 'import', containerType: 'Any', brokerLed: true },
    steps: [
      { name: 'Docs Intake', default: 'auto' },
      { name: 'Forward to Broker', default: 'auto' },
      { name: 'Broker Follow-up', default: 'auto' },
      { name: 'Arrival Notice', default: 'approve' },
      { name: 'Truck/Warehouse', default: 'approve', manualTriggers: ['exception'] },
      { name: 'Clearance Result', default: 'auto' },
      { name: 'Billing', default: 'approve', manualTriggers: ['dispute'] }
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

const generateShipmentEmails = (shipment) => {
  const baseEmails = {
    'SHP-001': [
      { id: 'e001', category: 1, direction: 'outbound', from: 'Agent', to: 'ABC Electronics', subject: 'ISF Filing Required - MSKU7234521', body: 'Dear ABC Electronics,\n\nWe need to file the ISF for your shipment MSKU7234521. Please provide:\n\n1. Commercial Invoice\n2. Packing List\n3. Bill of Lading\n\nBest regards,\nAgentOps', timestamp: '2025-01-05 09:00', read: true, autoLevel: 'draft' },
      { id: 'e002', category: 1, direction: 'inbound', from: 'ABC Electronics', to: 'Agent', subject: 'RE: ISF Filing Required - MSKU7234521', body: 'Documents attached.\n\nJohn Smith', timestamp: '2025-01-05 14:30', read: true },
      { id: 'e003', category: 1, direction: 'outbound', from: 'Agent', to: 'ABC Electronics', subject: 'ISF Filed Successfully - MSKU7234521', body: 'ISF confirmation: ISF2025010512345.\n\nAgentOps', timestamp: '2025-01-06 10:15', read: true, autoLevel: 'auto' },
    ],
    'SHP-002': [
      { id: 'e101', category: 1, direction: 'outbound', from: 'Agent', to: 'Global Toys Inc', subject: 'ISF Filing Required - OOLU8834521', body: 'ISF filing request...', timestamp: '2025-01-03 09:00', read: true, autoLevel: 'draft' },
      { id: 'e102', category: 1, direction: 'inbound', from: 'Global Toys Inc', to: 'Agent', subject: 'RE: ISF Filing - OOLU8834521', body: 'Documents attached.', timestamp: '2025-01-03 11:00', read: true },
      { id: 'e103', category: 2, direction: 'outbound', from: 'Agent', to: 'Global Toys Inc', subject: 'Arrival Notice - OOLU8834521', body: 'ETA: January 12, 2025\nVessel: OOCL ATLANTA', timestamp: '2025-01-07 08:00', read: true, autoLevel: 'draft' },
      { id: 'e104', category: 2, direction: 'inbound', from: 'Global Toys Inc', to: 'Agent', subject: 'RE: Arrival Notice - OOLU8834521', body: 'Confirmed, thanks.', timestamp: '2025-01-07 10:30', read: false },
    ],
    'SHP-003': [
      { id: 'e201', category: 1, direction: 'outbound', from: 'Agent', to: 'Fashion Forward', subject: 'ISF Filing - CMAU9912345', body: 'ISF filing request...', timestamp: '2025-01-02 09:00', read: true, autoLevel: 'draft' },
      { id: 'e202', category: 1, direction: 'inbound', from: 'Fashion Forward', to: 'Agent', subject: 'RE: ISF Filing - CMAU9912345', body: 'Documents sent.', timestamp: '2025-01-02 15:00', read: true },
      { id: 'e203', category: 2, direction: 'outbound', from: 'Agent', to: 'Fashion Forward', subject: 'Arrival Notice - CMAU9912345', body: 'ETA Jan 10.', timestamp: '2025-01-05 08:00', read: true, autoLevel: 'draft' },
      { id: 'e204', category: 2, direction: 'inbound', from: 'Fashion Forward', to: 'Agent', subject: 'RE: Arrival Notice', body: 'Got it!', timestamp: '2025-01-05 09:30', read: true },
      { id: 'e205', category: 3, direction: 'outbound', from: 'Agent', to: 'FastTrack Trucking', subject: 'Pickup Request - CMAU9912345', body: 'Please schedule pickup at Long Beach.', timestamp: '2025-01-06 14:00', read: true, autoLevel: 'draft' },
      { id: 'e206', category: 3, direction: 'outbound', from: 'Agent', to: 'FastTrack Trucking', subject: 'REMINDER: Pickup - CMAU9912345', body: 'Please confirm ASAP.', timestamp: '2025-01-07 14:00', read: true, autoLevel: 'auto' },
      { id: 'e207', category: 3, direction: 'inbound', from: 'FastTrack Trucking', to: 'Agent', subject: 'RE: Pickup Request', body: 'Can do Jan 11th, 2-4 PM.', timestamp: '2025-01-08 09:15', read: false },
    ],
    'SHP-004': [
      { id: 'e301', category: 1, direction: 'outbound', type: 'email', from: 'Agent', to: 'Home Decor Plus', cc: '', subject: 'ISF Filing - MSCU1234567', body: 'ISF request...', timestamp: '2025-01-01 09:00', read: true, autoLevel: 'draft' },
      { id: 'e302', category: 2, direction: 'outbound', type: 'email', from: 'Agent', to: 'Home Decor Plus', cc: '', subject: 'Arrival Notice - MSCU1234567', body: 'Arrival notice...', timestamp: '2025-01-03 08:00', read: true, autoLevel: 'draft' },
      { id: 'e303', category: 3, direction: 'outbound', type: 'email', from: 'Agent', to: 'Bay Area Trucking', cc: '', subject: 'Pickup Confirmed - MSCU1234567', body: 'Pickup for Jan 9.', timestamp: '2025-01-04 10:00', read: true, autoLevel: 'draft' },
      { id: 'e304', category: 4, direction: 'outbound', type: 'email', from: 'Agent', to: 'US Customs Broker', cc: 'ops@homedecorplus.com', subject: 'Customs Request - MSCU1234567', body: 'Please process clearance.', timestamp: '2025-01-05 09:00', read: true, autoLevel: 'draft' },
      { id: 'e305', category: 4, direction: 'inbound', type: 'email', from: 'US Customs Broker', to: 'Agent', cc: '', subject: 'RE: Customs - MSCU1234567', body: 'Processing. Duty: $2,850.', timestamp: '2025-01-08 08:45', read: true },
      { id: 'e306', category: 4, direction: 'third-party', type: 'activity', from: 'US Customs Broker', to: 'Oakland Warehouse', cc: '', subject: 'Broker coordinated with warehouse', body: 'Customs broker confirmed delivery schedule directly with warehouse team.', timestamp: '2025-01-08 10:12', read: true },
    ],
    'SHP-005': [
      { id: 'e401', category: 1, direction: 'outbound', from: 'Agent', to: 'Tech Solutions', subject: 'ISF Filed - HLCU2345678', body: 'ISF completed.', timestamp: '2024-12-28 09:00', read: true, autoLevel: 'auto' },
      { id: 'e402', category: 2, direction: 'outbound', from: 'Agent', to: 'Tech Solutions', subject: 'Arrival Notice - HLCU2345678', body: 'Arriving Jan 9.', timestamp: '2025-01-02 08:00', read: true, autoLevel: 'draft' },
      { id: 'e403', category: 3, direction: 'outbound', from: 'Agent', to: 'Express Logistics', subject: 'Trucker Confirmed - HLCU2345678', body: 'Pickup scheduled.', timestamp: '2025-01-03 10:00', read: true, autoLevel: 'draft' },
      { id: 'e404', category: 4, direction: 'outbound', from: 'Agent', to: 'Pacific Customs', subject: 'Customs Cleared - HLCU2345678', body: 'Customs cleared.', timestamp: '2025-01-05 14:00', read: true, autoLevel: 'auto' },
      { id: 'e405', category: 5, direction: 'outbound', from: 'Agent', to: 'Tech Solutions', subject: 'Duty Confirmation - HLCU2345678', body: 'Duty: $3,450. Please confirm.', timestamp: '2025-01-07 16:00', read: true, autoLevel: 'draft' },
      { id: 'e406', category: 5, direction: 'inbound', from: 'Tech Solutions', to: 'Agent', subject: 'RE: Duty Confirmation', body: 'Confirmed. Proceed.', timestamp: '2025-01-07 14:20', read: true },
    ],
    'SHP-006': [
      { id: 'e501', category: 1, direction: 'outbound', from: 'Agent', to: 'Garden Supplies Co', subject: 'ISF Complete - EGLV3456789', body: 'ISF filed.', timestamp: '2024-12-25 09:00', read: true, autoLevel: 'auto' },
      { id: 'e502', category: 2, direction: 'outbound', from: 'Agent', to: 'Garden Supplies Co', subject: 'Arrival Notice - EGLV3456789', body: 'ETA Jan 7.', timestamp: '2024-12-28 08:00', read: true, autoLevel: 'draft' },
      { id: 'e503', category: 3, direction: 'inbound', from: 'Harbor Trucking', to: 'Agent', subject: 'Pickup Confirmed - EGLV3456789', body: 'Will pickup Jan 7.', timestamp: '2024-12-30 10:00', read: true },
      { id: 'e504', category: 4, direction: 'inbound', from: 'West Coast Customs', to: 'Agent', subject: 'Cleared - EGLV3456789', body: 'Duty: $1,200.', timestamp: '2025-01-02 14:00', read: true },
      { id: 'e505', category: 5, direction: 'inbound', from: 'Garden Supplies Co', to: 'Agent', subject: 'Duty Approved - EGLV3456789', body: 'Approved.', timestamp: '2025-01-03 09:00', read: true },
      { id: 'e506', category: 6, direction: 'outbound', from: 'Agent', to: 'LA Warehouse', subject: 'Delivery Schedule - EGLV3456789', body: 'Schedule receiving for Jan 7.', timestamp: '2025-01-05 11:00', read: true, autoLevel: 'draft' },
      { id: 'e507', category: 6, direction: 'inbound', from: 'LA Warehouse', to: 'Agent', subject: 'RE: Delivery Schedule', body: 'Dock #7 reserved, 10AM-2PM.', timestamp: '2025-01-07 14:30', read: true },
    ],
    'SHP-007': [
      { id: 'e601', category: 1, direction: 'outbound', from: 'Agent', to: 'Sports Gear Ltd', subject: 'ISF Complete - YMLU4567890', body: 'ISF filed.', timestamp: '2024-12-20 09:00', read: true, autoLevel: 'auto' },
      { id: 'e602', category: 2, direction: 'outbound', from: 'Agent', to: 'Sports Gear Ltd', subject: 'Arrival Notice - YMLU4567890', body: 'ETA Jan 5.', timestamp: '2024-12-23 08:00', read: true, autoLevel: 'draft' },
      { id: 'e603', category: 3, direction: 'inbound', from: 'Quick Haul Inc', to: 'Agent', subject: 'Delivered - YMLU4567890', body: 'Container delivered.', timestamp: '2025-01-05 16:00', read: true },
      { id: 'e604', category: 4, direction: 'inbound', from: 'Federal Customs', to: 'Agent', subject: 'Cleared - YMLU4567890', body: 'All clear.', timestamp: '2024-12-28 14:00', read: true },
      { id: 'e605', category: 5, direction: 'inbound', from: 'Sports Gear Ltd', to: 'Agent', subject: 'Duty Paid - YMLU4567890', body: 'Payment sent.', timestamp: '2024-12-30 09:00', read: true },
      { id: 'e606', category: 6, direction: 'inbound', from: 'West Side Storage', to: 'Agent', subject: 'Received - YMLU4567890', body: 'Cargo received.', timestamp: '2025-01-05 18:00', read: true },
      { id: 'e607', category: 7, direction: 'outbound', from: 'Agent', to: 'Sports Gear Ltd', subject: 'Invoice - YMLU4567890', body: 'Total: $4,250. Due: Feb 4.', timestamp: '2025-01-05 19:00', read: true, autoLevel: 'auto' },
      { id: 'e608', category: 7, direction: 'inbound', from: 'Sports Gear Ltd', to: 'Agent', subject: 'RE: Invoice', body: 'Will pay in 7 days.', timestamp: '2025-01-06 10:00', read: true },
    ],
    'SHP-008': [
      { id: 'e701', category: 1, direction: 'outbound', type: 'email', from: 'Agent', to: 'Industrial Parts Inc', cc: '', subject: 'ISF Filed - ONEY5678901', body: 'ISF completed.', timestamp: '2024-12-28 09:00', read: true, autoLevel: 'auto' },
      { id: 'e702', category: 2, direction: 'outbound', type: 'email', from: 'Agent', to: 'Industrial Parts Inc', cc: '', subject: 'Arrival Notice - ONEY5678901', body: 'ETA Jan 6.', timestamp: '2024-12-31 08:00', read: true, autoLevel: 'draft' },
      { id: 'e703', category: 3, direction: 'outbound', type: 'email', from: 'Agent', to: 'Oakland Transport', cc: '', subject: 'Pickup Request - ONEY5678901', body: 'Schedule pickup at Oakland.', timestamp: '2025-01-03 10:00', read: true, autoLevel: 'draft' },
      { id: 'e704', category: 3, direction: 'outbound', type: 'email', from: 'Agent', to: 'Oakland Transport', cc: 'ops@industrialparts.com', subject: 'URGENT: Pickup - ONEY5678901', body: 'Please confirm ASAP.', timestamp: '2025-01-04 10:00', read: true, autoLevel: 'auto' },
      { id: 'e705', category: 3, direction: 'outbound', type: 'email', from: 'Agent', to: 'Oakland Transport', cc: '', subject: 'FINAL: Pickup - ONEY5678901', body: 'Respond or we find alternative.', timestamp: '2025-01-05 10:00', read: true, autoLevel: 'auto' },
      { id: 'e706', category: 3, direction: 'third-party', type: 'activity', from: 'Industrial Parts Inc', to: 'Oakland Transport', cc: '', subject: 'Customer contacted trucker directly', body: 'Customer called trucker to follow up on non-response.', timestamp: '2025-01-06 14:00', read: true },
      { id: 'e707', category: 3, direction: 'outbound', type: 'email', from: 'Agent', to: 'Industrial Parts Inc', cc: '', subject: 'ALERT: Trucker Issue - ONEY5678901', body: 'Escalating. Finding alternative.', timestamp: '2025-01-08 08:00', read: true, autoLevel: 'manual' },
    ],
  };
  return baseEmails[shipment.id] || [];
};

const initialShipments = [
  { id: 'SHP-001', reference: 'MSKU7234521', customer: 'ABC Electronics', origin: 'Shanghai', destination: 'Los Angeles', status: 'in-progress', step: 1, eta: '2025-01-15', alerts: 0, vessel: 'COSCO SHIPPING ARIES', bl: 'COSU6123456789', isfFiled: false, playbook: 'import-fcl', pendingActions: [
    { type: 'approve', step: 1, action: 'send_email', title: 'Send document request', desc: 'Request ISF documents from customer', recipients: ['john@abcelectronics.com'], riskReason: 'Standard request, template email' }
  ]},
  { id: 'SHP-002', reference: 'OOLU8834521', customer: 'Global Toys Inc', origin: 'Ningbo', destination: 'Long Beach', status: 'in-progress', step: 2, eta: '2025-01-12', alerts: 1, vessel: 'OOCL ATLANTA', bl: 'OOLU7234567890', isfFiled: true, playbook: 'import-fcl', pendingActions: [
    { type: 'manual', step: 2, action: 'isf_filing', title: 'File ISF on CBP', desc: 'ISF must be filed before vessel departure', recipients: [], riskReason: 'Regulatory requirement - manual filing required' }
  ]},
  { id: 'SHP-003', reference: 'CMAU9912345', customer: 'Fashion Forward', origin: 'Shenzhen', destination: 'Los Angeles', status: 'waiting', step: 5, eta: '2025-01-10', alerts: 2, vessel: 'CMA CGM MARCO POLO', bl: 'CMAU8345678901', isfFiled: true, playbook: 'import-fcl', pendingActions: [
    { type: 'approve', step: 5, action: 'confirm_time', title: 'Confirm pickup time', desc: 'Trucker proposed Jan 11, 2-4 PM', recipients: ['dispatch@fasttrack.com'], riskReason: 'Schedule confirmation' }
  ]},
  { id: 'SHP-004', reference: 'MSCU1234567', customer: 'Home Decor Plus', origin: 'Qingdao', destination: 'Oakland', status: 'in-progress', step: 6, eta: '2025-01-08', alerts: 0, vessel: 'MSC OSCAR', bl: 'MSCU9456789012', isfFiled: true, playbook: 'import-lcl', pendingActions: [] },
  { id: 'SHP-005', reference: 'HLCU2345678', customer: 'Tech Solutions', origin: 'Busan', destination: 'Los Angeles', status: 'waiting', step: 7, eta: '2025-01-09', alerts: 1, vessel: 'HAPAG LLOYD EXPRESS', bl: 'HLCU0567890123', isfFiled: true, playbook: 'import-ddp', pendingActions: [
    { type: 'manual', step: 7, action: 'approve_payment', title: 'Review duty payment $8,450', desc: 'Amount exceeds $5,000 threshold', recipients: ['accounting@techsolutions.com'], riskReason: 'High amount - requires manual review' }
  ]},
  { id: 'SHP-006', reference: 'EGLV3456789', customer: 'Garden Supplies Co', origin: 'Kaohsiung', destination: 'Long Beach', status: 'in-progress', step: 6, eta: '2025-01-07', alerts: 0, vessel: 'EVERGREEN EVER GIVEN', bl: 'EGLV1678901234', isfFiled: true, playbook: 'import-fcl', pendingActions: [] },
  { id: 'SHP-007', reference: 'YMLU4567890', customer: 'Sports Gear Ltd', origin: 'Tokyo', destination: 'Los Angeles', status: 'completed', step: 7, eta: '2025-01-05', alerts: 0, vessel: 'YANG MING WELLNESS', bl: 'YMLU2789012345', isfFiled: true, playbook: 'export-fcl', pendingActions: [] },
  { id: 'SHP-008', reference: 'ONEY5678901', customer: 'Industrial Parts Inc', origin: 'Singapore', destination: 'Oakland', status: 'alert', step: 5, eta: '2025-01-06', alerts: 3, vessel: 'ONE OLYMPUS', bl: 'ONEY3890123456', isfFiled: true, playbook: 'import-fcl', pendingActions: [
    { type: 'manual', step: 5, action: 'escalation', title: 'Trucker non-response', desc: 'No reply for 48+ hours - need alternative', recipients: ['ops@industrialparts.com'], riskReason: 'Escalation - may cause delay' }
  ]},
];

const testEmailShipments = [
  { id: 'SHP-009', reference: 'COSU6789012', customer: 'Smart Home Co', origin: 'Shanghai', destination: 'Los Angeles', status: 'new', step: 1, eta: '2025-01-20', alerts: 0, vessel: 'COSCO SHIPPING VENUS', bl: 'COSU4901234567', isfFiled: false, playbook: 'import-fcl', pendingActions: [], suggestReason: 'Detected: ISF requirement, FCL, US destination' },
  { id: 'SHP-010', reference: 'MAEU7890123', customer: 'Auto Parts Direct', origin: 'Yokohama', destination: 'Long Beach', status: 'new', step: 1, eta: '2025-01-22', alerts: 0, vessel: 'MAERSK EDINBURGH', bl: 'MAEU5012345678', isfFiled: false, playbook: 'import-lcl', pendingActions: [], suggestReason: 'Detected: CFS consolidation, LCL shipment' },
  { id: 'SHP-011', reference: 'ZIMU8901234', customer: 'Furniture World', origin: 'Ho Chi Minh', destination: 'Oakland', status: 'new', step: 1, eta: '2025-01-25', alerts: 0, vessel: 'ZIM SHANGHAI', bl: 'ZIMU6123456789', isfFiled: false, playbook: 'import-ddp', pendingActions: [], suggestReason: 'Detected: Incoterm DDP, duty pre-paid' },
  { id: 'SHP-012', reference: 'APLU9012345', customer: 'Medical Supplies LLC', origin: 'Mumbai', destination: 'Los Angeles', status: 'new', step: 1, eta: '2025-01-18', alerts: 0, vessel: 'APL SENTOSA', bl: 'APLU7234567890', isfFiled: false, playbook: 'broker-led', pendingActions: [], suggestReason: 'Detected: Email from customs broker' },
  { id: 'SHP-013', reference: 'EISU0123456', customer: 'Quick Trade Ltd', origin: 'Ningbo', destination: 'New York', status: 'waiting', step: 5, eta: '2025-01-10', alerts: 0, vessel: 'EVERGREEN ELITE', bl: 'EISU8345678901', isfFiled: false, playbook: 'free-hand', pendingActions: [
    { type: 'physical', step: 5, action: 'freight_release', title: 'Process Freight Release', desc: 'Payment received $4,280. Pay carrier and release cargo or send OBL.', recipients: [], riskReason: 'Physical action required' }
  ], suggestReason: 'Detected: Prepaid freight, collect on delivery' },
];

const stepLabels = ['ISF Filing', 'Arrival Notice', 'Trucker Coordination', 'Customs Coordination', 'Duty Confirmation', 'Warehouse Coordination', 'Billing & Collection'];
const stepIcons = [FileText, Send, Truck, Building, DollarSign, Warehouse, FileText];

const initialActivities = [
  { id: 1, timestamp: '2025-01-08 09:15', type: 'email-sent', shipment: 'SHP-002', message: 'Arrival Notice sent to Global Toys Inc' },
  { id: 2, timestamp: '2025-01-08 08:30', type: 'reminder', shipment: 'SHP-003', message: 'Trucker reminder sent (24hr follow-up)' },
  { id: 3, timestamp: '2025-01-08 08:00', type: 'alert', shipment: 'SHP-008', message: 'No response from trucker for 48hrs - escalated' },
  { id: 4, timestamp: '2025-01-07 16:45', type: 'completed', shipment: 'SHP-007', message: 'Invoice collected, billing completed' },
  { id: 5, timestamp: '2025-01-07 14:20', type: 'email-received', shipment: 'SHP-005', message: 'Customer confirmed duty payment' },
];

const initialMessages = [
  { id: 1, from: 'ABC Electronics', to: 'Agent', subject: 'RE: ISF Filing - MSKU7234521', timestamp: '2025-01-08 10:30', read: false, shipmentId: 'SHP-001', preview: 'Documents attached...' },
  { id: 2, from: 'FastTrack Trucking', to: 'Agent', subject: 'RE: Pickup - CMAU9912345', timestamp: '2025-01-08 09:15', read: false, shipmentId: 'SHP-003', preview: 'Can do Jan 11th...' },
  { id: 3, from: 'US Customs Broker', to: 'Agent', subject: 'Customs Update - MSCU1234567', timestamp: '2025-01-08 08:45', read: true, shipmentId: 'SHP-004', preview: 'Processing clearance...' },
  { id: 4, from: 'Agent', to: 'Tech Solutions', subject: 'Duty Confirmation - HLCU2345678', timestamp: '2025-01-07 16:00', read: true, shipmentId: 'SHP-005', preview: 'Please confirm $3,450...' },
  { id: 5, from: 'LA Warehouse', to: 'Agent', subject: 'RE: Delivery - EGLV3456789', timestamp: '2025-01-07 14:30', read: true, shipmentId: 'SHP-006', preview: 'Dock #7 reserved...' },
];

const designSystemCSS = `
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
    --chart-3: oklch(0.6056 0.2189 292.7172);
    --chart-4: oklch(0.7686 0.1647 70.0804);
    --chart-5: oklch(0.6959 0.1491 162.4796);
    --sidebar-foreground: oklch(0.5452 0 0);
  }
  * { font-family: 'Outfit', sans-serif; }
  input::placeholder { color: var(--sidebar-foreground); }
`;

export default function AgentOpsUI() {
  const [currentPage, setCurrentPage] = useState('actions');
  const [shipments, setShipments] = useState(initialShipments);
  const [activities, setActivities] = useState(initialActivities);
  const [messages] = useState(initialMessages);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showCommunications, setShowCommunications] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date('2025-01-08'));
  const [testEmailsLoaded, setTestEmailsLoaded] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAction, setEditingAction] = useState(null);

  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const loadTestEmails = () => {
    if (!testEmailsLoaded) {
      setShipments([...shipments, ...testEmailShipments]);
      setActivities([{ id: activities.length + 1, timestamp: formatDate(currentDate) + ' 10:00', type: 'email-received', shipment: 'SYSTEM', message: '6 new booking requests received' }, ...activities]);
      setTestEmailsLoaded(true);
    }
  };

  const fastForward = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
    setShipments(shipments.map(s => {
      if (s.status === 'new') return { ...s, status: 'in-progress' };
      if (s.step < 7 && Math.random() > 0.5) return { ...s, step: Math.min(s.step + 1, 7), status: s.step + 1 >= 7 ? 'completed' : s.status };
      return s;
    }));
    setActivities([{ id: activities.length + 1, timestamp: formatDate(newDate) + ' 08:00', type: 'system', shipment: 'SYSTEM', message: `+${days} day(s). ${Math.floor(Math.random() * 10) + 5} tasks processed.` }, ...activities]);
  };

  const toggleISFFiled = (id) => {
    setShipments(shipments.map(s => s.id === id ? { ...s, isfFiled: !s.isfFiled } : s));
    if (selectedShipment?.id === id) setSelectedShipment({ ...selectedShipment, isfFiled: !selectedShipment.isfFiled });
  };

  const getStatusStyle = (status) => {
    const styles = {
      'completed': { background: 'oklch(0.92 0.06 160)', color: 'var(--foreground)', border: '1px solid oklch(0.8 0.1 160)' },
      'in-progress': { background: 'oklch(0.92 0.06 250)', color: 'var(--foreground)', border: '1px solid oklch(0.7 0.15 250)' },
      'waiting': { background: 'oklch(0.95 0.06 70)', color: 'var(--foreground)', border: '1px solid oklch(0.8 0.12 70)' },
      'alert': { background: 'var(--destructive)', color: 'white', border: '1px solid var(--destructive)' },
      'new': { background: 'oklch(0.92 0.08 290)', color: 'var(--foreground)', border: '1px solid oklch(0.7 0.15 290)' }
    };
    return styles[status] || { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' };
  };

  const getActivityIcon = (type) => {
    const s = { width: 16, height: 16 };
    const icons = {
      'email-sent': <Send style={{ ...s, color: 'var(--muted-foreground)' }} />,
      'email-received': <Mail style={{ ...s, color: 'var(--muted-foreground)' }} />,
      'reminder': <Bell style={{ ...s, color: 'var(--muted-foreground)' }} />,
      'alert': <AlertTriangle style={{ ...s, color: 'var(--destructive)' }} />,
      'completed': <CheckCircle style={{ ...s, color: 'var(--primary)' }} />,
      'system': <RefreshCw style={{ ...s, color: 'var(--muted-foreground)' }} />
    };
    return icons[type] || <Clock style={{ ...s, color: 'var(--muted-foreground)' }} />;
  };

  const stats = {
    total: shipments.length,
    inProgress: shipments.filter(s => s.status === 'in-progress').length,
    waiting: shipments.filter(s => s.status === 'waiting').length,
    alerts: shipments.filter(s => s.status === 'alert').length,
    completed: shipments.filter(s => s.status === 'completed').length,
    new: shipments.filter(s => s.status === 'new').length,
  };

  const statusFiltered = filterStatus === 'all' ? shipments : shipments.filter(s => s.status === filterStatus);
  const filteredShipments = searchQuery.trim() === '' ? statusFiltered : statusFiltered.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.reference.toLowerCase().includes(q) || s.customer.toLowerCase().includes(q) || s.origin.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q);
  });

  const statCards = [
    { key: 'all', label: 'Total', value: stats.total, color: 'var(--chart-5)' },
    { key: 'in-progress', label: 'In Progress', value: stats.inProgress, color: 'var(--chart-2)' },
    { key: 'waiting', label: 'Waiting', value: stats.waiting, color: 'var(--chart-4)' },
    { key: 'alert', label: 'Alerts', value: stats.alerts, color: 'var(--destructive)' },
    { key: 'completed', label: 'Completed', value: stats.completed, color: 'var(--primary)' },
    { key: 'new', label: 'New', value: stats.new, color: 'var(--chart-3)' },
  ];

  const getGroupedEmails = (shipment) => {
    if (!shipment) return {};
    const emails = generateShipmentEmails(shipment);
    const grouped = {};
    emails.forEach(e => { if (!grouped[e.category]) grouped[e.category] = []; grouped[e.category].push(e); });
    return grouped;
  };

  const AutoLevelBadge = ({ level }) => {
    const config = level === 'auto' ? AUTOMATION_LEVELS.AUTO : level === 'draft' ? AUTOMATION_LEVELS.DRAFT : AUTOMATION_LEVELS.MANUAL;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
        <config.icon style={{ width: 10, height: 10 }} />{config.label}
      </span>
    );
  };

  return (
    <>
      <style>{designSystemCSS}</style>
      <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
        {/* Header */}
        <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, background: 'var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ship style={{ width: 26, height: 26, color: 'var(--primary-foreground)' }} />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>AgentOps</h1>
                <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: 0 }}>AI Freight Operations</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--muted)', borderRadius: 10 }}>
                <Calendar style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{formatDate(currentDate)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ label: '+1 Day', days: 1 }, { label: '+3 Days', days: 3 }, { label: '+1 Week', days: 7 }].map(btn => (
                  <button key={btn.days} onClick={() => fastForward(btn.days)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    {btn.days === 1 && <FastForward style={{ width: 14, height: 14 }} />}{btn.label}
                  </button>
                ))}
              </div>
              <button onClick={loadTestEmails} disabled={testEmailsLoaded} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: testEmailsLoaded ? 'var(--muted)' : 'var(--primary)', color: testEmailsLoaded ? 'var(--muted-foreground)' : 'var(--primary-foreground)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: testEmailsLoaded ? 'not-allowed' : 'pointer' }}>
                <Mail style={{ width: 16, height: 16 }} />{testEmailsLoaded ? 'Loaded' : 'Load Test Emails'}
              </button>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 20px' }}>
          {/* Navigation */}
          <nav style={{ display: 'flex', gap: 6, marginBottom: 28, background: 'var(--card)', padding: 6, borderRadius: 14, border: '1px solid var(--border)', width: 'fit-content' }}>
            {[
              { id: 'actions', label: 'Action Center', icon: Bell, count: shipments.reduce((acc, s) => acc + (s.pendingActions?.length || 0), 0), highlight: shipments.some(s => s.pendingActions?.some(a => a.type === 'approve' || a.type === 'manual')) },
              { id: 'shipments', label: 'Shipments', icon: Package, count: stats.total },
              { id: 'activity', label: 'Activity', icon: Clock, count: activities.length },
              { id: 'messages', label: 'Messages', icon: MessageSquare, count: messages.filter(m => !m.read).length },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button key={tab.id} onClick={() => setCurrentPage(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', background: currentPage === tab.id ? (tab.highlight && tab.count > 0 ? 'var(--chart-4)' : 'var(--primary)') : 'transparent', color: currentPage === tab.id ? 'white' : 'var(--muted-foreground)' }}>
                <tab.icon style={{ width: 18, height: 18 }} />{tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: currentPage === tab.id ? 'rgba(255,255,255,0.25)' : (tab.highlight ? 'var(--chart-4)' : 'var(--muted)'), color: currentPage === tab.id ? 'white' : (tab.highlight ? 'white' : 'var(--muted-foreground)') }}>{tab.count}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Action Center Page */}
          {currentPage === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <div style={{ background: 'var(--card)', borderRadius: 14, padding: 20, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Edit3 style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>Pending Approvals</span>
                  </div>
                  <p style={{ fontSize: 36, fontWeight: 600, color: 'var(--chart-4)', margin: 0 }}>{shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'approve').length || 0), 0)}</p>
                </div>
                <div style={{ background: 'var(--card)', borderRadius: 14, padding: 20, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Package style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>Physical Actions</span>
                  </div>
                  <p style={{ fontSize: 36, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'physical').length || 0), 0)}</p>
                </div>
                <div style={{ background: 'var(--card)', borderRadius: 14, padding: 20, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Shield style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>Needs Attention</span>
                  </div>
                  <p style={{ fontSize: 36, fontWeight: 600, color: 'var(--destructive)', margin: 0 }}>{shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'manual').length || 0), 0)}</p>
                </div>
                <div style={{ background: 'var(--card)', borderRadius: 14, padding: 20, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Zap style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>Auto-handled Today</span>
                  </div>
                  <p style={{ fontSize: 36, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>12</p>
                </div>
              </div>

              {/* Pending Approvals Section */}
              {shipments.some(s => s.pendingActions?.some(a => a.type === 'approve')) && (
                <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Edit3 style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Pending Approvals</h2>
                    <span style={{ padding: '4px 12px', background: 'var(--chart-4)', color: 'white', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'approve').length || 0), 0)}</span>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {shipments.flatMap(s => (s.pendingActions || []).filter(a => a.type === 'approve').map(action => ({ ...action, shipment: s, uniqueId: `${s.id}-${action.step}-${action.action}` }))).map((item) => {
                      const isEditing = editingAction === item.uniqueId;
                      return (
                      <div key={item.uniqueId} style={{ padding: 16, background: 'var(--muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 15 }}>{item.shipment.reference}</span>
                              <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>•</span>
                              <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>{item.shipment.customer}</span>
                              <span style={{ padding: '2px 8px', background: 'var(--chart-4)', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                {item.action === 'send_email' ? '📧 Send Email' : item.action === 'confirm_time' ? '🕐 Confirm Time' : item.action === 'approve_payment' ? '💰 Payment' : 'Approve'}
                              </span>
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 4px 0' }}>{item.title}</p>
                            <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 8px 0' }}>{item.desc}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                              {item.recipients?.length > 0 && (
                                <span style={{ color: 'var(--muted-foreground)' }}>📬 {item.recipients.join(', ')}</span>
                              )}
                              <span style={{ color: 'var(--muted-foreground)' }}>⚡ {item.riskReason}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                              <Check style={{ width: 16, height: 16 }} /> Approve
                            </button>
                            <button onClick={() => setEditingAction(isEditing ? null : item.uniqueId)} style={{ padding: '10px 14px', background: isEditing ? 'var(--chart-4)' : 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                              <Edit3 style={{ width: 16, height: 16, color: isEditing ? 'white' : 'var(--muted-foreground)' }} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Edit/Preview Panel */}
                        {isEditing && (
                          <div style={{ marginTop: 16, padding: 16, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                              <Mail style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>Draft Email Preview</span>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>To:</p>
                              <input type="text" defaultValue={item.recipients?.join(', ') || ''} placeholder="recipient@example.com, another@example.com" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>CC:</p>
                              <input type="text" defaultValue="" placeholder="cc@example.com (optional)" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>Subject:</p>
                              <input type="text" defaultValue={item.action === 'send_email' ? `ISF Documents Required - ${item.shipment.reference}` : `RE: ${item.title} - ${item.shipment.reference}`} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>Body:</p>
                              <textarea defaultValue={item.action === 'send_email' ? `Dear ${item.shipment.customer},\n\nWe need to file the ISF for your shipment ${item.shipment.reference}. Please provide:\n\n1. Commercial Invoice\n2. Packing List\n3. Bill of Lading\n\nBest regards,\nAgentOps` : item.action === 'confirm_time' ? `Hi,\n\nConfirmed. Please proceed with the pickup on ${item.desc.replace('Trucker proposed ', '')}.\n\nReference: ${item.shipment.reference}\n\nThank you.` : `Regarding ${item.title}...`} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                            <div style={{ marginBottom: 16, padding: 12, background: 'var(--muted)', borderRadius: 6, border: '1px dashed var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <FileText style={{ width: 14, height: 14 }} /> Attachments:
                                </p>
                                <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                                  <Plus style={{ width: 12, height: 12 }} /> Add File
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {item.action === 'send_email' && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                                    📄 ISF_Template.pdf <X style={{ width: 12, height: 12, color: 'var(--muted-foreground)', cursor: 'pointer' }} />
                                  </span>
                                )}
                                <span style={{ fontSize: 12, color: 'var(--sidebar-foreground)', padding: '4px 0' }}>
                                  {item.action !== 'send_email' && 'No attachments'}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button onClick={() => setEditingAction(null)} style={{ padding: '8px 16px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                <Send style={{ width: 14, height: 14 }} /> Save & Send
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );})}
                  </div>
                </div>
              )}

              {/* Physical Actions Section */}
              {shipments.some(s => s.pendingActions?.some(a => a.type === 'physical')) && (
                <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Package style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Physical Actions</h2>
                    <span style={{ padding: '4px 12px', background: 'var(--foreground)', color: 'white', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'physical').length || 0), 0)}</span>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {shipments.flatMap(s => (s.pendingActions || []).filter(a => a.type === 'physical').map(action => ({ ...action, shipment: s }))).map((item, idx) => (
                      <div key={idx} style={{ padding: 16, background: 'var(--muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 15 }}>{item.shipment.reference}</span>
                              <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>•</span>
                              <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>{item.shipment.customer}</span>
                              <span style={{ padding: '2px 8px', background: 'var(--foreground)', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                {item.action === 'freight_release' ? '📦 Freight Release' : '🔧 Physical'}
                              </span>
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 4px 0' }}>{item.title}</p>
                            <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 8px 0' }}>{item.desc}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                              <span style={{ color: 'var(--muted-foreground)' }}>📋 {item.riskReason}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button 
                              onClick={() => {
                                const updated = shipments.map(s => {
                                  if (s.id === item.shipment.id) {
                                    return {
                                      ...s,
                                      status: 'completed',
                                      pendingActions: s.pendingActions.filter(a => a.action !== item.action)
                                    };
                                  }
                                  return s;
                                });
                                setShipments(updated);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                            >
                              <Check style={{ width: 16, height: 16 }} /> Mark as Done
                            </button>
                            <button onClick={() => setSelectedShipment(item.shipment)} style={{ padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                              <ChevronRight style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Needs Attention Section */}
              {shipments.some(s => s.pendingActions?.some(a => a.type === 'manual')) && (
                <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Needs Attention</h2>
                    <span style={{ padding: '4px 12px', background: 'var(--destructive)', color: 'white', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'manual').length || 0), 0)}</span>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {shipments.flatMap(s => (s.pendingActions || []).filter(a => a.type === 'manual').map(action => ({ ...action, shipment: s }))).map((item, idx) => (
                      <div key={idx} style={{ padding: 16, background: 'var(--muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 15 }}>{item.shipment.reference}</span>
                              <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>•</span>
                              <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>{item.shipment.customer}</span>
                              <span style={{ padding: '2px 8px', background: 'var(--destructive)', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                {item.action === 'isf_filing' ? '📋 ISF Filing' : item.action === 'approve_payment' ? '💰 High Amount' : item.action === 'escalation' ? '🚨 Escalation' : '⚠️ Manual'}
                              </span>
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 4px 0' }}>{item.title}</p>
                            <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 8px 0' }}>{item.desc}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                              <span style={{ color: 'var(--muted-foreground)' }}>⚠️ {item.riskReason}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            {item.action === 'isf_filing' && (
                              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--foreground)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                <ExternalLink style={{ width: 16, height: 16 }} /> Go to CBP
                              </button>
                            )}
                            {item.action !== 'isf_filing' && (
                              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--destructive)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                <ExternalLink style={{ width: 16, height: 16 }} /> Handle in Gmail
                              </button>
                            )}
                            <button onClick={() => setSelectedShipment(item.shipment)} style={{ padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                              <ChevronRight style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-handled Today Section */}
              <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Zap style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                  <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Auto-handled Today</h2>
                  <span style={{ padding: '4px 12px', background: 'var(--primary)', color: 'white', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>12</span>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { time: '09:15', shipment: 'MSKU7234521', action: 'Sent 24hr follow-up reminder to trucker', type: 'email' },
                    { time: '09:00', shipment: 'OOLU8834521', action: 'Updated ocean tracking ETA', type: 'tracking' },
                    { time: '08:45', shipment: 'EGLV3456789', action: 'Sent arrival notice to customer', type: 'email' },
                    { time: '08:30', shipment: 'MSCU1234567', action: 'Forwarded docs to customs broker', type: 'email' },
                    { time: '08:15', shipment: 'YMLU4567890', action: 'Sent payment reminder (7-day)', type: 'email' },
                    { time: '08:00', shipment: 'HLCU2345678', action: 'Updated shipment status to In Transit', type: 'status' },
                    { time: '07:45', shipment: 'CMAU9912345', action: 'Logged inbound email from trucker', type: 'log' },
                    { time: '07:30', shipment: 'ONEY5678901', action: 'Sent 48hr escalation warning', type: 'email' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--muted)', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--sidebar-foreground)', fontWeight: 500, minWidth: 45 }}>{item.time}</span>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'oklch(0.94 0.04 160)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {item.type === 'email' ? <Send style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} /> : 
                         item.type === 'tracking' ? <Ship style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} /> :
                         item.type === 'status' ? <RefreshCw style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} /> :
                         <FileText style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', minWidth: 100 }}>{item.shipment}</span>
                      <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)', flex: 1 }}>{item.action}</span>
                      <span style={{ padding: '2px 8px', background: 'var(--primary)', color: 'white', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                        <Zap style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />AUTO
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Clear */}
              {!shipments.some(s => s.pendingActions?.length > 0) && (
                <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 60, textAlign: 'center' }}>
                  <CheckCircle style={{ width: 48, height: 48, color: 'var(--primary)', margin: '0 auto 16px' }} />
                  <h3 style={{ fontWeight: 600, fontSize: 18, margin: '0 0 8px 0' }}>All caught up!</h3>
                  <p style={{ color: 'var(--sidebar-foreground)', margin: 0 }}>No pending actions. Agent is handling everything automatically.</p>
                </div>
              )}
            </div>
          )}

          {/* Shipments Page */}
          {currentPage === 'shipments' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
                {statCards.map(stat => {
                  const isSelected = filterStatus === stat.key;
                  return (
                    <div key={stat.key} onClick={() => setFilterStatus(stat.key)} style={{ background: 'var(--card)', borderRadius: 14, padding: 18, border: isSelected ? `2px solid ${stat.color}` : '1px solid var(--border)', cursor: 'pointer', transform: isSelected ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: 'var(--muted-foreground)', fontWeight: 500 }}>{stat.label}</span>
                        <div style={{ width: 10, height: 10, borderRadius: 999, background: stat.color }} />
                      </div>
                      <p style={{ fontSize: 32, fontWeight: 600, color: isSelected ? stat.color : 'var(--foreground)', margin: '10px 0 0 0' }}>{stat.value}</p>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <Search style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                  <input type="text" placeholder="Search shipments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }} />
                  {searchQuery && <button onClick={() => setSearchQuery('')} style={{ padding: 4, background: 'var(--muted)', border: 'none', borderRadius: 6, cursor: 'pointer' }}><X style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} /></button>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
                {filteredShipments.map(shipment => {
                  const playbook = PLAYBOOKS[shipment.playbook];
                  const hasPending = shipment.pendingActions?.length > 0;
                  const pendingApprove = shipment.pendingActions?.filter(a => a.type === 'approve').length || 0;
                  const pendingManual = shipment.pendingActions?.filter(a => a.type === 'manual').length || 0;
                  return (
                  <div key={shipment.id} onClick={() => setSelectedShipment(shipment)} style={{ background: 'var(--card)', borderRadius: 14, padding: 22, border: hasPending ? '2px solid var(--chart-4)' : '1px solid var(--border)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 16 }}>{shipment.reference}</span>
                          {shipment.alerts > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'oklch(0.92 0.06 32)', color: 'var(--destructive)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}><AlertTriangle style={{ width: 12, height: 12 }} />{shipment.alerts}</span>}
                          {pendingApprove > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'oklch(0.95 0.08 70)', color: 'oklch(0.45 0.12 70)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}><Edit3 style={{ width: 12, height: 12 }} />{pendingApprove} to approve</span>}
                          {pendingManual > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'oklch(0.92 0.06 32)', color: 'var(--destructive)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}><Shield style={{ width: 12, height: 12 }} />{pendingManual} manual</span>}
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '4px 0 0 0' }}>{shipment.customer}</p>
                        {playbook && <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0 0', fontWeight: 500 }}>{playbook.name}</p>}
                      </div>
                      <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, ...getStatusStyle(shipment.status) }}>{shipment.status.replace('-', ' ')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 18 }}>
                      <span style={{ fontWeight: 500 }}>{shipment.origin}</span>
                      <ChevronRight style={{ width: 16, height: 16 }} />
                      <span style={{ fontWeight: 500 }}>{shipment.destination}</span>
                      <span>•</span>
                      <span>ETA: {shipment.eta}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {(playbook?.steps || stepLabels).map((s, idx) => <div key={idx} style={{ flex: 1, height: 8, borderRadius: 999, background: idx + 1 < shipment.step ? 'var(--primary)' : idx + 1 === shipment.step ? 'var(--chart-2)' : 'var(--muted)' }} title={typeof s === 'string' ? s : s.name} />)}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 10, fontWeight: 500 }}>Step {shipment.step}/{playbook?.steps.length || 7}: {playbook?.steps[shipment.step - 1]?.name || stepLabels[shipment.step - 1]}</p>
                  </div>
                );})}
              </div>
            </div>
          )}

          {/* Activity Page */}
          {currentPage === 'activity' && (
            <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
              <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Recent Activity</h2>
              </div>
              <div>
                {activities.map((activity, idx) => (
                  <div key={activity.id} style={{ padding: 18, display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: idx < activities.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getActivityIcon(activity.type)}</div>
                    <div>
                      <p style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>{activity.message}</p>
                      <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '4px 0 0 0' }}>{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Page */}
          {currentPage === 'messages' && (
            <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
              <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Messages</h2>
                <span style={{ padding: '6px 14px', background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{messages.filter(m => !m.read).length} unread</span>
              </div>
              <div>
                {messages.map((message, idx) => (
                  <div key={message.id} style={{ padding: 18, display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: idx < messages.length - 1 ? '1px solid var(--border)' : 'none', background: !message.read ? 'oklch(0.97 0.03 160 / 0.5)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: message.from === 'Agent' ? 'var(--primary)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {message.from === 'Agent' ? <Ship style={{ width: 24, height: 24, color: 'var(--primary-foreground)' }} /> : <User style={{ width: 24, height: 24, color: 'var(--muted-foreground)' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{message.from}</span>
                        <ChevronRight style={{ width: 14, height: 14, color: 'var(--border)' }} />
                        <span style={{ color: 'var(--sidebar-foreground)' }}>{message.to}</span>
                        {!message.read && <div style={{ width: 8, height: 8, background: 'var(--primary)', borderRadius: 999 }} />}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 500, margin: '6px 0' }}>{message.subject}</p>
                      <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: 0 }}>{message.preview}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Page */}
          {currentPage === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Playbooks Overview */}
              <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, background: 'var(--chart-5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText style={{ width: 22, height: 22, color: 'white' }} />
                  </div>
                  <div>
                    <h2 style={{ fontWeight: 600, fontSize: 20, margin: 0 }}>Playbooks</h2>
                    <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>Automation templates for different shipment types</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {Object.values(PLAYBOOKS).map(playbook => (
                    <div key={playbook.id} style={{ padding: 20, background: 'var(--muted)', borderRadius: 12 }}>
                      <h3 style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px 0' }}>{playbook.name}</h3>
                      <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 10px 0' }}>{playbook.desc}</p>
                      
                      {/* Recommended For Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {playbook.recommended?.map((tag, idx) => (
                          <span key={idx} style={{ padding: '3px 10px', background: 'var(--muted)', color: 'var(--foreground)', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{tag}</span>
                        ))}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {playbook.steps.map((step, idx) => {
                          const levelConfig = step.default === 'auto' ? AUTOMATION_LEVELS.AUTO : step.default === 'approve' ? AUTOMATION_LEVELS.APPROVE : AUTOMATION_LEVELS.MANUAL;
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--card)', borderRadius: 6, fontSize: 13 }}>
                              <span>{idx + 1}. {step.name}</span>
                              <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{levelConfig.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Escalation Rules */}
              <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, background: 'var(--destructive)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield style={{ width: 22, height: 22, color: 'white' }} />
                  </div>
                  <div>
                    <h2 style={{ fontWeight: 600, fontSize: 20, margin: 0 }}>Auto-Escalation Rules</h2>
                    <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>Any step escalates to MANUAL when triggered</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    { icon: DollarSign, text: 'Payment/duty > $5,000' },
                    { icon: AlertTriangle, text: 'Dispute, claim, penalty, damage' },
                    { icon: Shield, text: 'Customs hold or exam' },
                    { icon: User, text: 'New customer (first 3 shipments)' },
                    { icon: FileText, text: 'Formal docs: AN, Invoice' },
                    { icon: Clock, text: 'No response 48+ hours' },
                  ].map((rule, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'oklch(0.96 0.03 32)', borderRadius: 10 }}>
                      <rule.icon style={{ width: 18, height: 18, color: 'var(--destructive)' }} />
                      <span style={{ fontSize: 13 }}>{rule.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: 22, background: 'oklch(0.95 0.05 160)', borderRadius: 14, border: '1px solid var(--primary)' }}>
                <h3 style={{ fontWeight: 600, color: 'var(--primary-foreground)', margin: '0 0 10px 0' }}>Gemini 3 API Status</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, background: 'var(--chart-4)', borderRadius: 999, animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 14, color: 'var(--primary-foreground)', fontWeight: 500 }}>Waiting for API key</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Shipment Detail Modal */}
        {selectedShipment && !showCommunications && (
          <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
            <div style={{ background: 'var(--card)', borderRadius: 18, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ padding: 26, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'var(--card)', borderRadius: '18px 18px 0 0' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{selectedShipment.reference}</h2>
                    <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, ...getStatusStyle(selectedShipment.status) }}>{selectedShipment.status.replace('-', ' ')}</span>
                  </div>
                  <p style={{ color: 'var(--sidebar-foreground)', margin: '6px 0 0 0', fontSize: 15 }}>{selectedShipment.customer}</p>
                  {/* Playbook Selector */}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
                    <select 
                      value={selectedShipment.playbook} 
                      onChange={(e) => {
                        const updated = shipments.map(s => s.id === selectedShipment.id ? { ...s, playbook: e.target.value } : s);
                        setShipments(updated);
                        setSelectedShipment({ ...selectedShipment, playbook: e.target.value });
                      }}
                      style={{ padding: '4px 8px', fontSize: 13, fontWeight: 500, color: 'var(--foreground)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                    >
                      {Object.values(PLAYBOOKS).map(pb => (
                        <option key={pb.id} value={pb.id}>{pb.name}</option>
                      ))}
                    </select>
                    {selectedShipment.status === 'new' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--muted)', color: 'var(--muted-foreground)', borderRadius: 4, fontSize: 11, fontWeight: 600 }} title={selectedShipment.suggestReason || 'Auto-detected from email'}>
                        <Zap style={{ width: 10, height: 10 }} /> Agent suggested
                      </span>
                    )}
                  </div>
                  {selectedShipment.status === 'new' && selectedShipment.suggestReason && (
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '6px 0 0 0', fontStyle: 'italic' }}>💡 {selectedShipment.suggestReason}</p>
                  )}
                </div>
                <button onClick={() => setSelectedShipment(null)} style={{ padding: 10, background: 'var(--muted)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                  <X style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                </button>
              </div>

              <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 26 }}>
                {/* Pending Actions */}
                {selectedShipment.pendingActions?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bell style={{ width: 18, height: 18, color: 'var(--muted-foreground)' }} /> Action Required
                    </h3>
                    {selectedShipment.pendingActions.map((action, idx) => (
                      <div key={idx} style={{ padding: 16, background: action.type === 'manual' ? 'oklch(0.96 0.04 32)' : action.type === 'physical' ? 'var(--muted)' : 'oklch(0.97 0.04 70)', borderRadius: 12, border: `1px solid ${action.type === 'manual' ? 'var(--destructive)' : 'var(--border)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: action.type === 'manual' ? 'var(--destructive)' : action.type === 'physical' ? 'var(--foreground)' : 'oklch(0.65 0.12 70)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {action.type === 'manual' ? <Shield style={{ width: 18, height: 18, color: 'white' }} /> : action.type === 'physical' ? <Package style={{ width: 18, height: 18, color: 'white' }} /> : <Edit3 style={{ width: 18, height: 18, color: 'white' }} />}
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--foreground)' }}>{action.title}</p>
                              <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '4px 0 0 0' }}>{action.desc}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            {action.type === 'approve' && (
                              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                <Check style={{ width: 14, height: 14 }} /> Approve
                              </button>
                            )}
                            {action.type === 'physical' && (
                              <button 
                                onClick={() => {
                                  const updated = shipments.map(s => {
                                    if (s.id === selectedShipment.id) {
                                      const newShipment = {
                                        ...s,
                                        status: 'completed',
                                        pendingActions: s.pendingActions.filter(a => a.action !== action.action)
                                      };
                                      setSelectedShipment(newShipment);
                                      return newShipment;
                                    }
                                    return s;
                                  });
                                  setShipments(updated);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                              >
                                <Check style={{ width: 14, height: 14 }} /> Mark as Done
                              </button>
                            )}
                            {action.type === 'manual' && action.title.includes('ISF') && (
                              <button onClick={() => toggleISFFiled(selectedShipment.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--foreground)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                <ExternalLink style={{ width: 14, height: 14 }} /> Go to CBP
                              </button>
                            )}
                            {action.type === 'manual' && !action.title.includes('ISF') && (
                              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--destructive)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                <ExternalLink style={{ width: 14, height: 14 }} /> Handle in Gmail
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No Pending Actions */}
                {(!selectedShipment.pendingActions || selectedShipment.pendingActions.length === 0) && (
                  <div style={{ padding: 20, background: 'oklch(0.96 0.03 160)', borderRadius: 12, border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CheckCircle style={{ width: 24, height: 24, color: 'var(--primary)' }} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--foreground)' }}>All caught up!</p>
                      <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>Agent is handling this shipment automatically</p>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  {[{ label: 'Origin', value: selectedShipment.origin }, { label: 'Destination', value: selectedShipment.destination }, { label: 'Vessel', value: selectedShipment.vessel }, { label: 'B/L', value: selectedShipment.bl }, { label: 'ETA', value: selectedShipment.eta }, { label: 'Step', value: PLAYBOOKS[selectedShipment.playbook]?.steps[selectedShipment.step - 1]?.name || stepLabels[selectedShipment.step - 1] }].map(item => (
                    <div key={item.label} style={{ padding: 18, background: 'var(--muted)', borderRadius: 12 }}>
                      <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: 0, fontWeight: 500 }}>{item.label}</p>
                      <p style={{ fontWeight: 600, margin: '6px 0 0 0', fontSize: 15 }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Playbook Timeline */}
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: 16, margin: '0 0 18px 0' }}>Playbook Progress</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(PLAYBOOKS[selectedShipment.playbook]?.steps || stepLabels.map(s => ({ name: s, default: 'auto' }))).map((step, idx) => {
                      const StepIcon = stepIcons[idx] || FileText;
                      const isShipmentCompleted = selectedShipment.status === 'completed';
                      const isComplete = isShipmentCompleted || idx + 1 < selectedShipment.step;
                      const isCurrent = !isShipmentCompleted && idx + 1 === selectedShipment.step;
                      const stepName = typeof step === 'string' ? step : step.name;
                      const stepLevel = typeof step === 'string' ? 'auto' : step.default;
                      const levelConfig = stepLevel === 'auto' ? AUTOMATION_LEVELS.AUTO : stepLevel === 'approve' ? AUTOMATION_LEVELS.APPROVE : AUTOMATION_LEVELS.MANUAL;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isComplete ? 'var(--primary)' : isCurrent ? 'var(--primary)' : 'var(--muted)' }}>
                            {isComplete ? <CheckCircle style={{ width: 20, height: 20, color: 'var(--primary-foreground)' }} /> : isCurrent ? <Loader style={{ width: 20, height: 20, color: 'white', animation: 'spin 1s linear infinite' }} /> : <StepIcon style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <p style={{ fontWeight: 600, margin: 0, color: isComplete || isCurrent ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{idx + 1}. {stepName}</p>
                              <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{levelConfig.label}</span>
                            </div>
                            {isCurrent && <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0 0' }}>In progress...</p>}
                            {isComplete && <p style={{ fontSize: 12, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>✓ Completed by Agent</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14 }}>
                  <button onClick={() => { setShowCommunications(true); setExpandedCategory(null); setSelectedEmail(null); }} style={{ flex: 1, padding: 16, background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>View Activity Log</button>
                  <button style={{ padding: '16px 28px', background: 'transparent', color: 'var(--sidebar-foreground)', border: '1px solid var(--border)', borderRadius: 12, fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Override</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Log Modal (Communications) */}
        {showCommunications && selectedShipment && (
          <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
            <div style={{ background: 'var(--card)', borderRadius: 18, width: '100%', maxWidth: 900, height: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 26px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderRadius: '18px 18px 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button onClick={() => setShowCommunications(false)} style={{ padding: 10, background: 'var(--muted)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                    <ArrowLeft style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                  </button>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Activity Log</h2>
                    <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>{selectedShipment.reference} • {PLAYBOOKS[selectedShipment.playbook]?.name || 'Standard'}</p>
                  </div>
                </div>
                <button onClick={() => setShowCommunications(false)} style={{ padding: 10, background: 'var(--muted)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                  <X style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: 26 }}>
                {(() => {
                  const groupedEmails = getGroupedEmails(selectedShipment);
                  const categories = Object.keys(groupedEmails).map(Number).sort((a, b) => a - b);
                  const playbook = PLAYBOOKS[selectedShipment.playbook];
                  
                  if (categories.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Inbox style={{ width: 48, height: 48, color: 'var(--muted-foreground)', margin: '0 auto 16px' }} />
                        <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>No activity yet</p>
                        <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '8px 0 0 0' }}>Agent will start processing when documents arrive</p>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {categories.map(cat => {
                        const StepIcon = stepIcons[cat - 1] || FileText;
                        const emails = groupedEmails[cat];
                        const isExpanded = expandedCategory === cat;
                        const stepConfig = playbook?.steps[cat - 1];
                        const stepLevel = stepConfig?.default || 'auto';
                        const levelConfig = stepLevel === 'auto' ? AUTOMATION_LEVELS.AUTO : stepLevel === 'approve' ? AUTOMATION_LEVELS.APPROVE : AUTOMATION_LEVELS.MANUAL;
                        const isComplete = cat < selectedShipment.step;
                        const isCurrent = cat === selectedShipment.step;
                        
                        return (
                          <div key={cat} style={{ background: 'var(--muted)', borderRadius: 14, overflow: 'hidden' }}>
                            <button onClick={() => setExpandedCategory(isExpanded ? null : cat)} style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: isComplete ? 'var(--primary)' : isCurrent ? 'var(--primary)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {isComplete ? <CheckCircle style={{ width: 20, height: 20, color: 'white' }} /> : <StepIcon style={{ width: 20, height: 20, color: isCurrent ? 'white' : 'var(--muted-foreground)' }} />}
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{stepConfig?.name || stepLabels[cat - 1]}</p>
                                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{levelConfig.label}</span>
                                  </div>
                                  <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>
                                    {isComplete ? `✓ Completed • ${emails.length} actions` : isCurrent ? `In progress • ${emails.length} actions` : `${emails.length} actions`}
                                  </p>
                                </div>
                              </div>
                              <ChevronDown style={{ width: 20, height: 20, color: 'var(--muted-foreground)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            </button>

                            {isExpanded && (
                              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {emails.map((email) => {
                                  const isAuto = email.autoLevel === 'auto';
                                  const isApprove = email.autoLevel === 'approve' || email.autoLevel === 'draft';
                                  const isManual = email.autoLevel === 'manual';
                                  const isThirdParty = email.direction === 'third-party';
                                  const isEmailExpanded = selectedEmail?.id === email.id;
                                  
                                  return (
                                    <div key={email.id} onClick={() => setSelectedEmail(isEmailExpanded ? null : email)} style={{ background: isThirdParty ? 'oklch(0.98 0.01 280)' : 'var(--card)', borderRadius: 10, cursor: 'pointer', border: isThirdParty ? '1px dashed oklch(0.75 0.08 280)' : '1px solid var(--border)', overflow: 'hidden' }}>
                                      {/* Email Header */}
                                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: isThirdParty ? 'oklch(0.9 0.06 280)' : email.direction === 'outbound' ? 'var(--primary)' : 'oklch(0.6 0.12 250)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                          {isThirdParty ? <Users style={{ width: 18, height: 18, color: 'oklch(0.45 0.15 280)' }} /> : email.direction === 'outbound' ? <ArrowUpRight style={{ width: 18, height: 18, color: 'white' }} /> : <ArrowDownLeft style={{ width: 18, height: 18, color: 'white' }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{email.from}</span>
                                            <ChevronRight style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
                                            <span style={{ fontSize: 14, color: 'var(--sidebar-foreground)' }}>{email.to}</span>
                                            {email.cc && <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>(CC: {email.cc})</span>}
                                          </div>
                                          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', margin: '0 0 4px 0' }}>{email.subject}</p>
                                          <p style={{ fontSize: 12, color: 'var(--sidebar-foreground)', margin: 0 }}>{email.timestamp}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                          {email.direction === 'outbound' && email.autoLevel && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: isAuto ? 'oklch(0.94 0.04 160)' : isApprove ? 'oklch(0.95 0.06 70)' : 'oklch(0.94 0.04 32)', color: isAuto ? 'var(--primary)' : isApprove ? 'var(--chart-4)' : 'var(--destructive)', fontSize: 12, fontWeight: 600 }}>
                                              {isAuto ? <Zap style={{ width: 12, height: 12 }} /> : isApprove ? <Edit3 style={{ width: 12, height: 12 }} /> : <Shield style={{ width: 12, height: 12 }} />}
                                              {isAuto ? 'Auto sent' : isApprove ? 'Approved' : 'Manual'}
                                            </div>
                                          )}
                                          {email.direction === 'inbound' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'oklch(0.94 0.05 250)', color: 'oklch(0.5 0.12 250)', fontSize: 12, fontWeight: 600 }}>
                                              <ArrowDownLeft style={{ width: 12, height: 12 }} /> Received
                                            </div>
                                          )}
                                          {isThirdParty && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'oklch(0.9 0.06 280)', color: 'oklch(0.45 0.15 280)', fontSize: 12, fontWeight: 600 }}>
                                              <Users style={{ width: 12, height: 12 }} /> 3rd Party
                                            </div>
                                          )}
                                          <ChevronDown style={{ width: 18, height: 18, color: 'var(--muted-foreground)', transform: isEmailExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                        </div>
                                      </div>
                                      
                                      {/* Expanded Email Body */}
                                      {isEmailExpanded && (
                                        <div style={{ padding: '0 16px 16px 64px' }}>
                                          <div style={{ padding: 16, background: 'var(--muted)', borderRadius: 8 }}>
                                            <p style={{ fontSize: 14, color: 'var(--foreground)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{email.body}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
      </div>
    </>
  );
}
