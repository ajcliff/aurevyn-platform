export interface TaxResult {
  amount: number;
}

export async function calculateTax(
  subtotal: number
): Promise<TaxResult> {

  return {
    amount: 0,
  };

}