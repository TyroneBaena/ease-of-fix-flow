
// QR code generation utility for property maintenance requests
export const generateQRCodeUrl = (propertyId: string): string => {
  // Create a URL that points directly to the new request form with the property ID pre-selected
  const baseUrl = window.location.origin;
  return `${baseUrl}/new-request?propertyId=${propertyId}`;
};

// Function to download the QR code as an image
export const downloadQRCode = (qrCodeId: string, propertyName: string): void => {
  // Find the QR code SVG element
  const qrCodeSVG = document.getElementById(qrCodeId);
  if (!qrCodeSVG) {
    console.error('QR Code SVG element not found');
    return;
  }

  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Canvas context not available');
    return;
  }

  // Set canvas dimensions
  canvas.width = 300; // Slightly larger than QR code for padding
  canvas.height = 300;

  // Create an image from the SVG
  const svgData = new XMLSerializer().serializeToString(qrCodeSVG);
  const img = new Image();
  
  // Create a blob URL for the SVG
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  img.onload = () => {
    // Fill canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Center the QR code on the canvas
    const padding = 50; // Add padding around the QR code
    ctx.drawImage(img, padding/2, padding/2, canvas.width-padding, canvas.height-padding);
    
    // Create a download link
    const a = document.createElement('a');
    a.download = `${propertyName.replace(/\s+/g, '-')}-qr-code.png`;
    a.href = canvas.toDataURL('image/png');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
};
