import {
    Send, Mail, Bell, AlertTriangle, CheckCircle, RefreshCw, Clock
} from 'lucide-react';

// Generate shipment emails based on shipment data
export const generateShipmentEmails = (shipment) => {
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

// Get status style based on shipment status
export const getStatusStyle = (status) => {
    const styles = {
        'completed': { background: 'oklch(0.92 0.06 160)', color: 'var(--foreground)', border: '1px solid oklch(0.8 0.1 160)' },
        'in-progress': { background: 'oklch(0.92 0.06 250)', color: 'var(--foreground)', border: '1px solid oklch(0.7 0.15 250)' },
        'waiting': { background: 'oklch(0.95 0.06 70)', color: 'var(--foreground)', border: '1px solid oklch(0.8 0.12 70)' },
        'alert': { background: 'var(--destructive)', color: 'white', border: '1px solid var(--destructive)' },
        'new': { background: 'oklch(0.92 0.08 290)', color: 'var(--foreground)', border: '1px solid oklch(0.7 0.15 290)' }
    };
    return styles[status] || { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' };
};

// Get activity icon based on type
export const getActivityIcon = (type) => {
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

// Format date helper
export const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

// Get grouped emails by category
export const getGroupedEmails = (shipment) => {
    if (!shipment) return {};
    const emails = generateShipmentEmails(shipment);
    const grouped = {};
    emails.forEach(e => { if (!grouped[e.category]) grouped[e.category] = []; grouped[e.category].push(e); });
    return grouped;
};
