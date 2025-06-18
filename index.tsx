
import { GoogleGenAI } from "@google/genai"; // Keep for potential future use

// Declare html2pdf for TypeScript
declare var html2pdf: any;

// --- localStorage Keys ---
const LOCAL_STORAGE_VEHICLE_NUMBERS_KEY = 'weighSlipApp_vehicleNumbers';
const LOCAL_STORAGE_MATERIAL_NAMES_KEY = 'weighSlipApp_materialNames';
const LOCAL_STORAGE_NEXT_SERIAL_NO_KEY = 'weighSlipApp_nextSerialNo';
const MAX_SUGGESTIONS = 50;
const MAX_SERIAL_NO = 100000;

// --- Helper Functions for Suggestions ---
function loadSuggestions(key: string): string[] {
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error(`Error parsing suggestions from localStorage for key ${key}:`, e);
            return [];
        }
    }
    return [];
}

function populateDatalist(datalistId: string, suggestions: string[]) {
    const datalist = document.getElementById(datalistId);
    if (datalist) {
        datalist.innerHTML = '';
        suggestions.forEach(suggestion => {
            const option = document.createElement('option');
            option.value = suggestion;
            datalist.appendChild(option);
        });
    }
}

function addSuggestion(key: string, value: string, datalistId: string) {
    if (!value || value.trim() === "") return;

    let suggestions = loadSuggestions(key);
    const trimmedValue = value.trim();

    suggestions = suggestions.filter(s => s.toLowerCase() !== trimmedValue.toLowerCase());
    suggestions.unshift(trimmedValue);

    if (suggestions.length > MAX_SUGGESTIONS) {
        suggestions = suggestions.slice(0, MAX_SUGGESTIONS);
    }

    try {
        localStorage.setItem(key, JSON.stringify(suggestions));
        populateDatalist(datalistId, suggestions);
    } catch (e) {
        console.error(`Error saving suggestions to localStorage for key ${key}:`, e);
    }
}

// --- Serial Number Management ---
function loadNextSerialNo(): number {
    const storedSerialNo = localStorage.getItem(LOCAL_STORAGE_NEXT_SERIAL_NO_KEY);
    if (storedSerialNo) {
        const num = parseInt(storedSerialNo, 10);
        if (!isNaN(num) && num > 0) {
            return Math.min(num, MAX_SERIAL_NO);
        }
    }
    return 1;
}

function saveNextSerialNo(usedSerialNo: number): number {
    let nextSerialNo = usedSerialNo + 1;
    if (nextSerialNo > MAX_SERIAL_NO) {
        nextSerialNo = 1; // Reset to 1 if max is exceeded
    } else if (usedSerialNo >= MAX_SERIAL_NO) { // If current was already max
        nextSerialNo = 1;
    }
    try {
        localStorage.setItem(LOCAL_STORAGE_NEXT_SERIAL_NO_KEY, String(nextSerialNo));
    } catch (e) {
        console.error("Error saving next serial number to localStorage:", e);
    }
    return nextSerialNo;
}

// Helper function to format date as DD-MM-YYYY
function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Helper function to format time as HH:MM AM/PM
function formatTime(timeString: string): string {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    if (hours === undefined || minutes === undefined) return '';
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return `${String(formattedHours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function formatWeightInput(value: string): string {
    const trimmedValue = value.trim();
    if (trimmedValue === "") return "0.000";
    let num = parseFloat(trimmedValue);
    if (isNaN(num)) return "0.000";
    if (!trimmedValue.includes('.')) {
        const intPart = trimmedValue.match(/^-?\d+/)?.[0];
        if (intPart && intPart.replace('-', '').length >= 4) {
            num = num / 1000;
        }
    }
    return num.toFixed(3);
}

function updatePreview() {
    const serialNoInput = document.getElementById('serialNo') as HTMLInputElement;
    const serialNo = serialNoInput ? serialNoInput.value : loadNextSerialNo().toString();
    const vehicleNo = (document.getElementById('vehicleNo') as HTMLInputElement).value;
    const materialName = (document.getElementById('materialName') as HTMLInputElement).value;
    
    const grossWeight = parseFloat((document.getElementById('grossWeight') as HTMLInputElement).value) || 0;
    const grossDate = (document.getElementById('grossDate') as HTMLInputElement).value;
    const outTime = (document.getElementById('outTime') as HTMLInputElement).value;
    
    const tareWeight = parseFloat((document.getElementById('tareWeight') as HTMLInputElement).value) || 0;
    const tareDate = (document.getElementById('tareDate') as HTMLInputElement).value;
    const inTime = (document.getElementById('inTime') as HTMLInputElement).value;

    const netWeight = grossWeight - tareWeight;

    (document.getElementById('previewSerialNo') as HTMLElement).textContent = serialNo;
    (document.getElementById('previewVehicleNo') as HTMLElement).textContent = vehicleNo;
    (document.getElementById('previewMaterialName') as HTMLElement).textContent = materialName;
    (document.getElementById('previewSupplier') as HTMLElement).textContent = "HI-TECH WEIGH BRIDGE, ENDHAL";
    
    (document.getElementById('previewGrossWeight') as HTMLElement).textContent = grossWeight.toFixed(3);
    (document.getElementById('previewGrossDate') as HTMLElement).textContent = formatDate(grossDate);
    (document.getElementById('previewOutTime') as HTMLElement).textContent = formatTime(outTime);
    
    (document.getElementById('previewTareWeight') as HTMLElement).textContent = tareWeight.toFixed(3);
    (document.getElementById('previewTareDate') as HTMLElement).textContent = formatDate(tareDate);
    (document.getElementById('previewInTime') as HTMLElement).textContent = formatTime(inTime);
    
    (document.getElementById('previewNetWeight') as HTMLElement).textContent = netWeight.toFixed(3);
    (document.getElementById('netWeightDisplay') as HTMLElement).textContent = netWeight.toFixed(3);
}

function calculateNetWeight() {
    const grossWeight = parseFloat((document.getElementById('grossWeight') as HTMLInputElement).value) || 0;
    const tareWeight = parseFloat((document.getElementById('tareWeight') as HTMLInputElement).value) || 0;
    const netWeight = grossWeight - tareWeight;
    (document.getElementById('netWeightDisplay') as HTMLElement).textContent = netWeight.toFixed(3);
    
    const previewNetWeightEl = document.getElementById('previewNetWeight');
    if (previewNetWeightEl) {
        previewNetWeightEl.textContent = netWeight.toFixed(3);
    }
}

async function generatePdf() {
    const slipElement = document.getElementById('slipPreview') as HTMLElement;
    if (!slipElement) {
        console.error('Slip preview element not found!');
        alert('Error: Could not find slip preview for PDF generation.');
        return;
    }

    const serialNoInput = document.getElementById('serialNo') as HTMLInputElement;
    const currentSerialNo = serialNoInput.value;

    const filename = `WeighSlip_${currentSerialNo}.pdf`;

    const options = {
        margin: [5, 5, 5, 5], // top, left, bottom, right in mm
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const pdfBtn = document.getElementById('downloadPdfBtn') as HTMLButtonElement;
    const originalButtonText = pdfBtn?.textContent || 'Download Slip (PDF)';

    if (pdfBtn) {
        pdfBtn.disabled = true;
        pdfBtn.textContent = 'Generating...';
    }
    
    try {
        await html2pdf().from(slipElement).set(options).save();

        const newNextSerialNo = saveNextSerialNo(parseInt(currentSerialNo, 10));
        serialNoInput.value = String(newNextSerialNo);
        updatePreview(); 
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('An error occurred while generating the PDF. Please try again.');
    } finally {
        if (pdfBtn) {
            pdfBtn.disabled = false;
            pdfBtn.textContent = originalButtonText;
        }
    }
}

async function generateDualPdf() {
    const slipElement = document.getElementById('slipPreview') as HTMLElement;
    if (!slipElement) {
        console.error('Slip preview element not found for dual PDF!');
        alert('Error: Could not find slip preview for PDF generation.');
        return;
    }

    const serialNoInput = document.getElementById('serialNo') as HTMLInputElement;
    const currentSerialNo = serialNoInput.value;

    const filename = `WeighSlip_Dual_${currentSerialNo}.pdf`;

    // Create a container for the two slips
    const dualSlipContainer = document.createElement('div');
    dualSlipContainer.style.display = 'flex';
    dualSlipContainer.style.flexDirection = 'column';
    dualSlipContainer.style.alignItems = 'center'; // Center slips horizontally on the page
    dualSlipContainer.style.width = '210mm'; // A4 width


    const slip1 = slipElement.cloneNode(true) as HTMLElement;
    const slip2 = slipElement.cloneNode(true) as HTMLElement;

    // Optional: Add a small spacer div for visual separation or cutting guide
    const spacer = document.createElement('div');
    spacer.style.height = '5mm'; // Adjust as needed, or set to 0 if no space desired
    // Example of a cutting line:
    // spacer.style.borderTop = '1px dashed #ccc';
    // spacer.style.margin = '2mm 0';
    // spacer.style.width = '80%'; // Make line shorter than slip width

    dualSlipContainer.appendChild(slip1);
    dualSlipContainer.appendChild(spacer);
    dualSlipContainer.appendChild(slip2);
    
    // It's crucial that the individual slips do not have conflicting page-break rules
    // if html2pdf is to place them on one page. The default `avoid-all` on slipElement itself
    // is fine, as we are controlling the container.

    const options = {
        margin: [5, 5, 5, 5], // top, left, bottom, right in mm
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // Apply to the container
    };

    const pdfBtn = document.getElementById('downloadDualPdfBtn') as HTMLButtonElement;
    const originalButtonText = pdfBtn?.textContent || 'Download 2 Slips (PDF)';

    if (pdfBtn) {
        pdfBtn.disabled = true;
        pdfBtn.textContent = 'Generating...';
    }
    
    try {
        await html2pdf().from(dualSlipContainer).set(options).save();

        const newNextSerialNo = saveNextSerialNo(parseInt(currentSerialNo, 10));
        serialNoInput.value = String(newNextSerialNo);
        updatePreview(); 
    } catch (error) {
        console.error('Error generating dual PDF:', error);
        alert('An error occurred while generating the dual PDF. Please try again.');
    } finally {
        if (pdfBtn) {
            pdfBtn.disabled = false;
            pdfBtn.textContent = originalButtonText;
        }
    }
}


function setDefaultDateTimeAndSerial() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    (document.getElementById('grossDate') as HTMLInputElement).value = currentDate;
    (document.getElementById('outTime') as HTMLInputElement).value = currentTime;
    (document.getElementById('tareDate') as HTMLInputElement).value = currentDate;
    (document.getElementById('inTime') as HTMLInputElement).value = currentTime;

    const serialNoInput = document.getElementById('serialNo') as HTMLInputElement;
    if (serialNoInput) {
        serialNoInput.value = String(loadNextSerialNo());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const vehicleNoSuggestions = loadSuggestions(LOCAL_STORAGE_VEHICLE_NUMBERS_KEY);
    populateDatalist('vehicleNoSuggestions', vehicleNoSuggestions);

    const materialNameSuggestions = loadSuggestions(LOCAL_STORAGE_MATERIAL_NAMES_KEY);
    populateDatalist('materialNameSuggestions', materialNameSuggestions);

    setDefaultDateTimeAndSerial();

    const form = document.getElementById('weighSlipForm');
    if (form) {
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                updatePreview(); 
                if (input.id === 'grossWeight' || input.id === 'tareWeight') {
                    calculateNetWeight(); 
                }
            });

            if (input.id === 'grossWeight' || input.id === 'tareWeight') {
                input.addEventListener('blur', () => {
                    const field = input as HTMLInputElement;
                    field.value = formatWeightInput(field.value);
                    updatePreview();
                    calculateNetWeight();
                });
            }

            if (input.id === 'vehicleNo') {
                input.addEventListener('blur', () => {
                    addSuggestion(LOCAL_STORAGE_VEHICLE_NUMBERS_KEY, (input as HTMLInputElement).value, 'vehicleNoSuggestions');
                });
            }
            if (input.id === 'materialName') {
                input.addEventListener('blur', () => {
                    addSuggestion(LOCAL_STORAGE_MATERIAL_NAMES_KEY, (input as HTMLInputElement).value, 'materialNameSuggestions');
                });
            }
        });
    }

    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => generatePdf());
    }

    const downloadDualPdfBtn = document.getElementById('downloadDualPdfBtn');
    if (downloadDualPdfBtn) {
        downloadDualPdfBtn.addEventListener('click', () => generateDualPdf());
    }

    const grossWeightInput = document.getElementById('grossWeight') as HTMLInputElement;
    const tareWeightInput = document.getElementById('tareWeight') as HTMLInputElement;
    grossWeightInput.value = formatWeightInput(grossWeightInput.value); 
    tareWeightInput.value = formatWeightInput(tareWeightInput.value);   

    updatePreview(); 
    calculateNetWeight(); 
});

// Example API call function
const API_BASE_URL = process.env.REACT_APP_API_URL;

async function createSlip(slipData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/slips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slipData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to create slip:", error);
  }
}
