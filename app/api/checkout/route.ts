import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestClient } from "@/lib/supabase/request";
import { sendOrderConfirmation } from "@/lib/email";
import type { Order, OrderItem } from "@/lib/types";

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  address: z.string().trim().min(5, "Enter your delivery address").max(300),
  city: z.string().trim().min(2, "Enter your city and state").max(100),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "Your cart is empty")
    .max(50),
});

export async function POST(request: Request) {
  // 1. Authenticate (cookie session on the website, bearer token from the mobile app).
  const { supabase, user } = await createRequestClient(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Please sign in to place an order." }, { status: 401 });
  }

  // 2. Validate input.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors = Object.fromEntries(
      Object.entries(flat).map(([key, msgs]) => [key, msgs?.[0]]),
    );
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fieldErrors },
      { status: 422 },
    );
  }

  const input = parsed.data;

  // Merge duplicate lines so one product appears once.
  const merged = new Map<string, number>();
  for (const item of input.items) {
    merged.set(item.productId, Math.min(20, (merged.get(item.productId) ?? 0) + item.quantity));
  }

  // 3. Create the order atomically. Prices and stock are checked in the database.
  const { data: placed, error: placeError } = await supabase
    .rpc("place_order", {
      p_items: [...merged].map(([product_id, quantity]) => ({ product_id, quantity })),
      p_full_name: input.fullName,
      p_phone: input.phone,
      p_address: input.address,
      p_city: input.city,
      p_email: user.email,
    })
    .single<{ order_id: string; order_number: string }>();

  if (placeError || !placed) {
    // Business rule errors (stock, empty cart) come back as code 22023.
    const status = placeError?.code === "22023" ? 409 : 500;
    console.error("place_order failed", placeError);
    return NextResponse.json(
      {
        error:
          status === 409
            ? placeError!.message
            : "We could not place your order. Please try again.",
      },
      { status },
    );
  }

  // 4. Load the saved order and send the confirmation email.
  const { data: order, error: loadError } = await supabase
    .from("orders")
    .select(
      "id, order_number, email, full_name, phone, address, city, status, subtotal_kobo, shipping_kobo, total_kobo, created_at, order_items (id, product_name, unit_price_kobo, quantity, line_total_kobo)",
    )
    .eq("id", placed.order_id)
    .single<Order & { order_items: OrderItem[] }>();

  let emailSent = false;
  if (!loadError && order) {
    try {
      await sendOrderConfirmation(order, order.order_items);
      emailSent = true;
    } catch (err) {
      // The order is saved. A failed email must not fail the checkout.
      console.error("Order confirmation email failed", err);
    }
  } else {
    console.error("Could not reload order for email", loadError);
  }

  return NextResponse.json(
    { orderId: placed.order_id, orderNumber: placed.order_number, emailSent },
    { status: 201 },
  );
}
