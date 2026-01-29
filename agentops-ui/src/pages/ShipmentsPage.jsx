import React from 'react';
import { Search, X } from 'lucide-react';
import StatCard from '../components/StatCard';
import ShipmentCard from '../components/ShipmentCard';

export default function ShipmentsPage({
    shipments,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    setSelectedShipment,
    onDeleteShipment
}) {
    const stats = {
        total: shipments.length,
        inProgress: shipments.filter(s => s.status === 'in-progress').length,
        waiting: shipments.filter(s => s.status === 'waiting').length,
        alerts: shipments.filter(s => s.status === 'alert').length,
        completed: shipments.filter(s => s.status === 'completed').length,
        new: shipments.filter(s => s.status === 'new').length,
    };

    const statCards = [
        { key: 'all', label: 'Total', value: stats.total, color: 'var(--chart-5)' },
        { key: 'in-progress', label: 'In Progress', value: stats.inProgress, color: 'var(--chart-2)' },
        { key: 'waiting', label: 'Waiting', value: stats.waiting, color: 'var(--chart-4)' },
        { key: 'alert', label: 'Alerts', value: stats.alerts, color: 'var(--destructive)' },
        { key: 'completed', label: 'Completed', value: stats.completed, color: 'var(--primary)' },
        { key: 'new', label: 'New', value: stats.new, color: 'var(--chart-3)' },
    ];

    const statusFiltered = filterStatus === 'all' ? shipments : shipments.filter(s => s.status === filterStatus);
    const filteredShipments = searchQuery.trim() === '' ? statusFiltered : statusFiltered.filter(s => {
        const q = searchQuery.toLowerCase();
        return s.reference.toLowerCase().includes(q) || s.customer.toLowerCase().includes(q) || s.origin.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q);
    });

    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
                {statCards.map(stat => (
                    <StatCard
                        key={stat.key}
                        stat={stat}
                        isSelected={filterStatus === stat.key}
                        onClick={() => setFilterStatus(stat.key)}
                    />
                ))}
            </div>
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <Search style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    <input
                        type="text"
                        placeholder="Search shipments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={{ padding: 4, background: 'var(--muted)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            <X style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
                        </button>
                    )}
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
                {filteredShipments.map(shipment => (
                    <ShipmentCard
                        key={shipment.id}
                        shipment={shipment}
                        onClick={() => setSelectedShipment(shipment)}
                        onDelete={onDeleteShipment}
                    />
                ))}
            </div>
        </div>
    );
}
