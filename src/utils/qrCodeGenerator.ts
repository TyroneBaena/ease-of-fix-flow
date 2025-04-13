
// This is a placeholder for actual QR code generation
// In a real implementation, we would use a library like qrcode.react
export const generateQRCodeUrl = (propertyId: string): string => {
  // This would be the URL that points to the new request form with property ID
  const baseUrl = window.location.origin;
  return `${baseUrl}/new-request?propertyId=${propertyId}`;
};
