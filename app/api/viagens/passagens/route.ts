import { NextResponse } from "next/server";
import { upsertPassagem } from "../../../../lib/viagemService";
import type { Passagem, Percurso } from "../../types";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { viagemId, viagem, passagem } = body as {
      viagemId?: string;
      viagem?: { dataViagem: string; percurso: Percurso };
      passagem?: Passagem;
    };

    if (!passagem || !passagem.cliente) {
      return NextResponse.json({ error: "passagem.cliente é obrigatório" }, { status: 400 });
    }

    // call service
    const result = await upsertPassagem({
      viagemId,
      dataViagem: viagem?.dataViagem,
      percurso: viagem?.percurso,
      passagem,
    });

    return NextResponse.json({ ok: true, result }, { status: result.action === "created" ? 201 : 200 });
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
