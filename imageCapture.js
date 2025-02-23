// Currency patterns for detection
const CURRENCY_PATTERNS = {
    USD: /\$|USD|Dollar/i,
    EUR: /€|EUR|Euro/i,
    GBP: /£|GBP|Pound/i,
    JPY: /¥|JPY|Yen/i,
    GHS: /₵|GHS|Cedi/i,
    NGN: /₦|NGN|Naira/i,
    CNY: /¥|CNY|Yuan/i,
    INR: /₹|INR|Rupee/i,
    // Add more currency patterns as needed
};

// Function to handle image capture and OCR processing
let imageCapture = null;
let scanning = false;

async function captureCurrency() {
    try {
        // Create scanner UI if it doesn't exist
        if (!document.getElementById('scanner-container')) {
            createScannerUI();
        }

        // Get video stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });

        const videoElement = document.getElementById('scanner-video');
        videoElement.srcObject = stream;
        
        // Show scanner UI
        document.getElementById('scanner-container').style.display = 'flex';
        
        // Initialize ImageCapture
        const track = stream.getVideoTracks()[0];
        imageCapture = new ImageCapture(track);

        // Enable capture button
        document.getElementById('capture-button').disabled = false;
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Error accessing camera. Please make sure you have granted camera permissions.');
    }
}

// Create enhanced scanner UI elements with file upload
function createScannerUI() {
    const scannerContainer = document.createElement('div');
    scannerContainer.id = 'scanner-container';
    scannerContainer.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    `;

    // Create tab interface
    const tabContainer = document.createElement('div');
    tabContainer.style.cssText = `
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
    `;

    const cameraTab = document.createElement('button');
    cameraTab.textContent = '📷 Camera';
    cameraTab.onclick = () => switchTab('camera');
    
    const uploadTab = document.createElement('button');
    uploadTab.textContent = '📤 Upload';
    uploadTab.onclick = () => switchTab('upload');

    [cameraTab, uploadTab].forEach(tab => {
        tab.style.cssText = `
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        `;
    });

    tabContainer.appendChild(cameraTab);
    tabContainer.appendChild(uploadTab);

    // Camera view
    const cameraView = document.createElement('div');
    cameraView.id = 'camera-view';
    
    const video = document.createElement('video');
    video.id = 'scanner-video';
    video.autoplay = true;
    video.style.cssText = `
        max-width: 100%;
        max-height: 70vh;
        border: 2px solid #fff;
        border-radius: 8px;
    `;

    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'scanner-overlay';
    overlayCanvas.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
    `;

    cameraView.appendChild(video);
    cameraView.appendChild(overlayCanvas);

    // Upload view
    const uploadView = document.createElement('div');
    uploadView.id = 'upload-view';
    uploadView.style.display = 'none';

    const uploadArea = document.createElement('div');
    uploadArea.style.cssText = `
        width: 300px;
        height: 200px;
        border: 2px dashed #fff;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
    `;
    uploadArea.innerHTML = `
        <div>📤 Drop image here or click to upload</div>
        <div style="margin-top: 10px; font-size: 0.8em">Supported formats: JPG, PNG, GIF</div>
    `;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.onchange = handleFileSelect;

    uploadArea.onclick = () => fileInput.click();
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#007bff';
    };
    uploadArea.ondragleave = () => {
        uploadArea.style.borderColor = '#fff';
    };
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#fff';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processUploadedFile(file);
        }
    };

    uploadView.appendChild(uploadArea);
    uploadView.appendChild(fileInput);

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        margin-top: 20px;
        display: flex;
        gap: 10px;
    `;

    const captureButton = document.createElement('button');
    captureButton.id = 'capture-button';
    captureButton.textContent = '📸 Capture';
    captureButton.onclick = processImage;
    captureButton.disabled = true;

    const closeButton = document.createElement('button');
    closeButton.textContent = '❌ Close';
    closeButton.onclick = closeScannerUI;

    [captureButton, closeButton].forEach(button => {
        button.style.cssText = `
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        `;
    });
    closeButton.style.background = '#dc3545';

    buttonContainer.appendChild(captureButton);
    buttonContainer.appendChild(closeButton);

    // Assemble all elements
    scannerContainer.appendChild(tabContainer);
    scannerContainer.appendChild(cameraView);
    scannerContainer.appendChild(uploadView);
    scannerContainer.appendChild(buttonContainer);
    document.body.appendChild(scannerContainer);

    // Add scanning guide overlay
    drawScanningOverlay();
}

// Switch between camera and upload views
function switchTab(tab) {
    const cameraView = document.getElementById('camera-view');
    const uploadView = document.getElementById('upload-view');
    const captureButton = document.getElementById('capture-button');

    if (tab === 'camera') {
        cameraView.style.display = 'block';
        uploadView.style.display = 'none';
        captureButton.style.display = 'block';
        captureCurrency(); // Reinitialize camera
    } else {
        cameraView.style.display = 'none';
        uploadView.style.display = 'block';
        captureButton.style.display = 'none';
        closeCameraStream();
    }
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        processUploadedFile(file);
    }
}

// Process uploaded file
async function processUploadedFile(file) {
    if (scanning) return;

    scanning = true;
    showProcessingUI();

    try {
        const imageUrl = URL.createObjectURL(file);
        const result = await Tesseract.recognize(
            imageUrl,
            'eng',
            { logger: m => console.log(m) }
        );

        // Process OCR result
        const { amount, currency } = extractCurrencyInfo(result.data.text);
        
        if (amount) {
            document.getElementById('amount').value = amount;
            if (currency) {
                document.getElementById('fromCurrency').value = currency;
            }
            closeScannerUI();
        } else {
            alert('No valid amount detected. Please try again.');
        }

        URL.revokeObjectURL(imageUrl);
    } catch (error) {
        console.error('Error processing image:', error);
        alert('Error processing image. Please try again.');
    } finally {
        scanning = false;
        hideProcessingUI();
    }
}

// Extract currency information from OCR text
function extractCurrencyInfo(text) {
    // First, try to find currency symbols and patterns
    for (const [currency, pattern] of Object.entries(CURRENCY_PATTERNS)) {
        if (pattern.test(text)) {
            // Find numbers near the currency symbol
            const numbers = text.match(/\d+([.,]\d+)?/g);
            if (numbers && numbers.length > 0) {
                return {
                    amount: parseFloat(numbers[0].replace(',', '.')),
                    currency: currency
                };
            }
        }
    }

    // If no currency symbol found, just return the first number
    const numbers = text.match(/\d+([.,]\d+)?/g);
    return {
        amount: numbers ? parseFloat(numbers[0].replace(',', '.')) : null,
        currency: null
    };
}

// Show processing UI
function showProcessingUI() {
    const buttonContainer = document.querySelector('#scanner-container > div:last-child');
    const processingMsg = document.createElement('div');
    processingMsg.id = 'processing-message';
    processingMsg.style.cssText = `
        color: white;
        margin-top: 10px;
        text-align: center;
    `;
    processingMsg.textContent = 'Processing image...';
    buttonContainer.appendChild(processingMsg);
}

// Hide processing UI
function hideProcessingUI() {
    const processingMsg = document.getElementById('processing-message');
    if (processingMsg) {
        processingMsg.remove();
    }
}

// Process captured image (previous implementation)
async function processImage() {
    if (!imageCapture || scanning) return;

    scanning = true;
    showProcessingUI();
    const captureButton = document.getElementById('capture-button');
    captureButton.disabled = true;

    try {
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg');
        
        const result = await Tesseract.recognize(
            imageData,
            'eng',
            { logger: m => console.log(m) }
        );

        const { amount, currency } = extractCurrencyInfo(result.data.text);
        
        if (amount) {
            document.getElementById('amount').value = amount;
            if (currency) {
                document.getElementById('fromCurrency').value = currency;
            }
            closeScannerUI();
        } else {
            alert('No valid amount detected. Please try again.');
        }
    } catch (error) {
        console.error('Error processing image:', error);
        alert('Error processing image. Please try again.');
    } finally {
        scanning = false;
        hideProcessingUI();
        captureButton.disabled = false;
    }
}

// Close camera stream
function closeCameraStream() {
    const video = document.getElementById('scanner-video');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    imageCapture = null;
}

// Close scanner UI and clean up
function closeScannerUI() {
    const container = document.getElementById('scanner-container');
    if (container) {
        closeCameraStream();
        container.style.display = 'none';
    }
    scanning = false;
}

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        closeScannerUI();
    }
});