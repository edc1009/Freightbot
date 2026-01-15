// Excel to JSON conversion service
import * as XLSX from 'xlsx';

export async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Convert all sheets to JSON
                const result = {};
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    result[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                });

                resolve({
                    filename: file.name,
                    sheets: workbook.SheetNames,
                    data: result
                });
            } catch (error) {
                reject(new Error(`Failed to parse Excel file: ${error.message}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsArrayBuffer(file);
    });
}

export function isExcelFile(file) {
    const excelTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    const excelExtensions = ['.xlsx', '.xls', '.xlsm'];

    return excelTypes.includes(file.type) ||
        excelExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

export function formatExcelAsText(excelData) {
    if (!excelData?.data) return '';

    let text = '';
    Object.entries(excelData.data).forEach(([sheetName, rows]) => {
        text += `\n=== Sheet: ${sheetName} ===\n`;
        rows.forEach((row, idx) => {
            if (row.some(cell => cell !== '')) {
                text += `Row ${idx + 1}: ${row.filter(c => c !== '').join(' | ')}\n`;
            }
        });
    });

    return text;
}
