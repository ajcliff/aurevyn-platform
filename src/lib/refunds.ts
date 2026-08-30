import { createClient } from "@/lib/supabase";

const supabase = createClient();

export async function createRefund(
    returnId: string,
    amount: number,
    method: string
) {

    const { error } =
        await supabase
            .from("pos_payments")
            .insert({

                sale_id: returnId,

                payment_method: method,

                amount: -amount

            });

    if (error) throw error;
}