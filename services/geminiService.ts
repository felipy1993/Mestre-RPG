
import { GoogleGenAI, Type } from "@google/genai";
import { Character, GameLog } from "../types";

const SYSTEM_INSTRUCTION = `Você é um Mestre de RPG (Dungeon Master) experiente e criativo. 
Sua tarefa é conduzir uma aventura épica para o jogador usando um sistema baseado em d20.

REGRAS:
1. Sempre responda em Português do Brasil.
2. Descreva cenas com riqueza de detalhes sensoriais e atmosfera imersiva.
3. Gerencie NPCs e vilões com personalidades distintas.
4. Quando o jogador quiser realizar uma ação desafiadora (atacar, investigar, persuadir, etc.), você DEVE solicitar explicitamente um teste de d20 através do campo "requiresRoll".
5. Sempre forneça de 3 a 4 opções de ações sugeridas no campo "options".
6. Se o jogador ganhar ou encontrar um item, descreva na narração.
7. O formato de resposta deve ser SEMPRE um JSON válido seguindo o esquema fornecido.`;

// Using gemini-3-pro-preview for high-quality creative reasoning in DM tasks.
export const startNewGame = async (): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: "Inicie o jogo de RPG me cumprimentando e pedindo para eu criar meu personagem (Gênero, Raça, Classe).",
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  return response.text || "Erro ao iniciar o jogo.";
};

export const generateSceneImage = async (narration: string): Promise<string | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Fantasy RPG oil painting, high-quality concept art: ${narration.substring(0, 300)}. Immersive lighting, detailed environment.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Erro ao gerar imagem da cena:", e);
  }
  return undefined;
};

export const sendMessageToDM = async (
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[]
): Promise<{ text: string; options: string[]; requiresRoll?: { type: string } }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      ...history,
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          narration: { type: Type.STRING, description: "A descrição narrativa da cena em português." },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Lista de 3 a 4 ações sugeridas para o jogador."
          },
          requiresRoll: {
            type: Type.OBJECT,
            properties: { 
              type: { type: Type.STRING, description: "O tipo de atributo ou perícia exigida (ex: Força, Percepção)." } 
            },
            description: "Obrigatório se uma ação exigir um teste de dado."
          }
        },
        required: ["narration", "options"]
      }
    }
  });

  try {
    const json = JSON.parse(response.text.trim());
    // Mapping 'narration' from JSON schema to the 'text' property expected by UI components.
    return {
      text: json.narration,
      options: json.options,
      requiresRoll: json.requiresRoll
    };
  } catch (e) {
    console.error("Erro ao processar JSON do DM:", e);
    return { 
      text: response.text || "O Mestre ficou em silêncio por um momento...", 
      options: ["Continuar", "Observar ao redor", "Esperar"] 
    };
  }
};
