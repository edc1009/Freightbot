import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Pioneer Global Logistics - Arrival Notice PDF Generator
export const generateArrivalNoticePDF = (shipment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- HEADER ---
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 153); // Pioneer Blue
    doc.text("PIONEER GLOBAL LOGISTICS INC.", 14, 15);

    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text("4710 ONTARIO MILLS PKWY, SUITE#B", 14, 20);
    doc.text("ONTARIO, CA 91764", 14, 24);
    doc.text("UNITED STATES", 14, 28);
    doc.text("TEL: 909-493-3488 FAX: 909-493-3498", 14, 32);
    doc.text("EMAIL: edwardchen@pg-logistics.net", 14, 36);

    // Title
    doc.setFontSize(18);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'bold');
    doc.text("ARRIVAL NOTICE /", 130, 15);
    doc.text("CHARGEABLE ITEMS", 130, 23);
    doc.setFont('helvetica', 'normal');

    // --- METADATA GRID ---
    const startY = 40;
    doc.setLineWidth(0.1);
    doc.setFontSize(9);

    // Helper to draw box with label and value
    const drawBox = (x, y, w, h, label, value) => {
        doc.rect(x, y, w, h);
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(label, x + 1, y + 3.5);
        doc.setFontSize(9);
        doc.setTextColor(0);
        if (value) doc.text(String(value).substring(0, 35), x + 1, y + 8);
    };

    // Row 1: Shipper | Refs
    drawBox(14, startY, 90, 20, "Shipper", shipment.shipper || "CHARTER LINK LOGISTICS LTD.");
    drawBox(104, startY, 45, 10, "Reference No.", shipment.ref_no || shipment.id?.substring(0, 8));
    drawBox(149, startY, 45, 10, "Date", new Date().toLocaleString());
    drawBox(104, startY + 10, 45, 10, "Master B/L No.", shipment.bl_number || shipment.bl);
    drawBox(149, startY + 10, 45, 10, "Prepared By", "EDWARD CHEN");

    // Row 2: Consignee | House BL
    drawBox(14, startY + 20, 90, 20, "Consignee", shipment.consignee || shipment.customer || "CTL LAX, INC.");
    drawBox(104, startY + 20, 45, 10, "Sub B/L No.", "");
    drawBox(149, startY + 20, 45, 10, "House B/L No.", shipment.hbl_number || shipment.booking_number || "SH26010007");
    drawBox(104, startY + 30, 45, 10, "AMS B/L No.", "");
    drawBox(149, startY + 30, 45, 10, "Customer Ref No.", "");

    // Row 3: Notify | Vessel Data
    drawBox(14, startY + 40, 90, 20, "Notify Party", shipment.notify_party || shipment.consignee); // Fallback to consignee
    drawBox(104, startY + 40, 90, 10, "Vessel & Voyage No.", `${shipment.vessel || ''} ${shipment.voyage || ''}`);

    drawBox(104, startY + 50, 45, 10, "Port of Loading", shipment.origin || "SHANGHAI");
    drawBox(149, startY + 50, 45, 10, "ETD", shipment.etd || "01-01-2026");

    drawBox(104, startY + 60, 45, 10, "Port of Discharge", shipment.pod || "LONG BEACH, CA");
    drawBox(149, startY + 60, 45, 10, "ETA", shipment.eta || "01-19-2026");

    drawBox(104, startY + 70, 45, 10, "Place of Delivery", shipment.pod || "LONG BEACH, CA"); // Often same as POD
    drawBox(149, startY + 70, 45, 10, "ETA", shipment.eta);

    drawBox(104, startY + 80, 45, 10, "Final Destination", shipment.destination || shipment.pod);
    drawBox(149, startY + 80, 45, 10, "ETA", shipment.eta);

    // Row 4: Broker/Loc | Firms
    drawBox(14, startY + 90, 90, 10, "Freight Location", shipment.freight_location || "LONG BEACH CONTAINER TERMINAL");
    drawBox(104, startY + 90, 45, 10, "FIRMS Code", shipment.firms_code || "WAC8");
    drawBox(149, startY + 90, 45, 10, "Available Date", "");

    drawBox(14, startY + 100, 90, 10, "Container Return Location", "");
    drawBox(104, startY + 100, 45, 10, "Last Free Date", "");
    drawBox(149, startY + 100, 45, 10, "G.O. Date", "");


    // --- CONTAINER TABLE ---
    const tableStartY = startY + 115;

    const containerData = shipment.processed_shipments?.length > 0
        ? shipment.processed_shipments.map(s => [
            s.container_number || "TBD",
            s.package_count || "1",
            s.description || "CONSOLIDATED CARGO",
            s.weight || "0 KGS",
            s.volume || "0 CBM"
        ])
        : [[shipment.container || "N/M", "1 Unit", "Generaly Cargo", "0 KGS", "0 CBM"]];

    autoTable(doc, {
        startY: tableStartY,
        head: [['Container No/Seal No', 'Pkgs', 'Description of Goods', 'Gross Weight', 'Measurement']],
        body: containerData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 153], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
    });

    // --- REMARKS ---
    let finalY = doc.lastAutoTable.finalY + 5;
    drawBox(14, finalY, 180, 10, "REMARKS", "EXPRESS RELEASE");

    // --- CHARGES TABLE ---
    finalY += 15;

    // Prepare Charges
    const charges = shipment.financials?.charges || [
        { description: "OCEAN FREIGHT CHARGE", amount: "2165.00", currency: "USD", prepaid_or_collect: "Collect" },
        { description: "AMS FILING FEE", amount: "30.00", currency: "USD", prepaid_or_collect: "Collect" },
        { description: "HANDLING CHARGE", amount: "35.00", currency: "USD", prepaid_or_collect: "Collect" }
    ];

    // Separate Prepaid and Collect columns
    const chargeRows = charges.map(c => [
        c.description,
        c.prepaid_or_collect === 'Prepaid' ? c.amount : '',
        c.prepaid_or_collect === 'Collect' ? c.amount : ''
    ]);

    // Calculate Totals
    const totalPrepaid = charges
        .filter(c => c.prepaid_or_collect === 'Prepaid')
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
        .toFixed(2);

    const totalCollect = charges
        .filter(c => c.prepaid_or_collect === 'Collect')
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
        .toFixed(2);

    chargeRows.push(['', '', '']); // Spacer
    chargeRows.push(['Total Amount', totalPrepaid > 0 ? totalPrepaid : '', totalCollect]);

    autoTable(doc, {
        startY: finalY,
        head: [['Description of Charges', 'Prepaid', 'Collect']],
        body: chargeRows,
        theme: 'grid',
        headStyles: { fillColor: [100, 0, 0], textColor: 255, fontSize: 8 }, // Dark Red like example
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 110 },
            1: { cellWidth: 35, halign: 'right' },
            2: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
    });

    // Footer
    finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(7);
    doc.text("Please make checks payable to: PIONEER GLOBAL LOGISTICS INC.", 14, finalY);

    return doc;
};
