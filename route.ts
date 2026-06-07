import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GOAL_LABELS: Record<string, string> = {
  perder_gordura: "Perder gordura corporal",
  ganhar_massa: "Ganhar massa muscular",
  recomposicao: "Recomposição corporal",
  manter: "Manter peso atual",
  performance: "Melhorar performance atlética",
};

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
    }

    const body = await request.json();
    const { weight, height, waist, age, gender, goal, images } = body;

    if (!weight || !height || !waist || !goal || !images?.front || !images?.side || !images?.back) {
      return NextResponse.json({ error: "Todos os campos e fotos são obrigatórios" }, { status: 400 });
    }

    // Validate base64 images
    for (const [key, val] of Object.entries(images)) {
      if (typeof val !== "string" || !val.startsWith("data:image/")) {
        return NextResponse.json({ error: `Imagem inválida: ${key}` }, { status: 400 });
      }
    }

    const extractBase64 = (dataUrl: string) => ({
      data: dataUrl.split(",")[1],
      mediaType: dataUrl.split(";")[0].split(":")[1] as "image/jpeg" | "image/png" | "image/webp",
    });

    const front = extractBase64(images.front);
    const side = extractBase64(images.side);
    const back = extractBase64(images.back);

    const imc = (weight / Math.pow(height / 100, 2)).toFixed(1);
    const goalLabel = GOAL_LABELS[goal] || goal;

    const prompt = `Você é um especialista em fisiologia do exercício, nutrição esportiva e análise corporal. Analise as 3 fotos corporais (frontal, lateral e posterior) e os dados antropométricos abaixo.

DADOS:
- Peso: ${weight}kg | Altura: ${height}cm | IMC: ${imc}
- Cintura: ${waist}cm${age ? ` | Idade: ${age} anos` : ""}${gender ? ` | Sexo: ${gender}` : ""}
- Objetivo: ${goalLabel}

Analise com atenção: distribuição de gordura corporal, massa muscular visível, postura e alinhamento, proporções corporais, simetria, condição física geral.

IMPORTANTE: Retorne APENAS JSON válido. Sem texto antes, sem texto depois, sem markdown, sem blocos de código.

{
  "body_fat_range": "faixa estimada ex: 18-22%",
  "physique_summary": "resumo detalhado em 3-4 frases com observações específicas das fotos",
  "strengths": ["ponto forte 1","ponto forte 2","ponto forte 3","ponto forte 4"],
  "weaknesses": ["área a melhorar 1","área a melhorar 2","área a melhorar 3","área a melhorar 4"],
  "weekly_forecast": "previsão realista de resultados em 4-8 semanas seguindo as recomendações",
  "training_recommendation": ["recomendação 1","recomendação 2","recomendação 3","recomendação 4","recomendação 5"],
  "nutrition_recommendation": ["recomendação 1","recomendação 2","recomendação 3","recomendação 4","recomendação 5"],
  "fitness_score": 65,
  "posture_notes": "observação específica de postura observada nas fotos",
  "body_type": "tipo corporal identificado (Ectomorfo / Mesomorfo / Endomorfo / Misto)"
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", source: { type: "base64", media_type: front.mediaType, data: front.data } },
            { type: "image", source: { type: "base64", media_type: side.mediaType, data: side.data } },
            { type: "image", source: { type: "base64", media_type: back.mediaType, data: back.data } },
          ],
        },
      ],
    });

    const raw = response.content.find((b) => b.type === "text")?.text ?? "";

    let parsed;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("IA não retornou JSON válido");
      parsed = JSON.parse(match[0]);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[Corpore/analyze]", err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
