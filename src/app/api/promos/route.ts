import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type PromoPayload = {
  name: string;
  bookmaker: string;
  type: string;
  stake: number;
  odds: number;
  outcome: string;
  freebets: number;
  cashbackRate: number;
  cashbackCap: number;
  date: string;
  notes: string;
};

type PromoRecord = {
  id: string;
  name: string;
  bookmaker: string;
  type: string;
  stake: number | string;
  odds: number | string;
  outcome: string;
  freebets: number | string;
  cashback_rate: number | string;
  cashback_cap: number | string;
  event_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

function mapPromoRecord(record: PromoRecord) {
  return {
    id: record.id,
    name: record.name,
    bookmaker: record.bookmaker,
    type: record.type,
    stake: Number(record.stake),
    odds: Number(record.odds),
    outcome: record.outcome,
    freebets: Number(record.freebets),
    cashbackRate: Number(record.cashback_rate),
    cashbackCap: Number(record.cashback_cap),
    date: record.event_date,
    notes: record.notes,
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("promos")
      .select("*")
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map((record) => mapPromoRecord(record as PromoRecord)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de charger les paris.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PromoPayload;
    const supabase = getSupabaseAdminClient();
    const insertPayload = {
      name: body.name?.trim() || "Promo",
      bookmaker: body.bookmaker,
      type: body.type,
      stake: Number(body.stake),
      odds: Number(body.odds),
      outcome: body.outcome,
      freebets: Number(body.freebets ?? 0),
      cashback_rate: Number(body.cashbackRate ?? 0),
      cashback_cap: Number(body.cashbackCap ?? 0),
      event_date: body.date,
      notes: body.notes ?? "",
    };

    const { data, error } = await supabase.from("promos").insert(insertPayload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapPromoRecord(data as PromoRecord), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible d'enregistrer le pari.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
