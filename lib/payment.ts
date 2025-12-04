/**
 * Payment Adapter
 * 
 * This is a mock implementation for MVP.
 * TODO: Replace with Zarinpal/Shaparak gateway integration for Iranian payment processing.
 */

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  message?: string;
}

/**
 * Initiates a payment transaction
 * @param amount - The amount to charge
 * @param bookingId - The booking ID associated with this payment
 * @returns Payment result with transaction ID
 */
export async function initiatePayment(
  amount: number,
  bookingId: string
): Promise<PaymentResult> {
  // Mock implementation - simulates payment processing
  // In production, this will integrate with Zarinpal or Shaparak gateway
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: `mock_${Date.now()}_${bookingId}`,
        message: 'Payment processed successfully (mock)',
      });
    }, 500); // Simulate network delay
  });
}

