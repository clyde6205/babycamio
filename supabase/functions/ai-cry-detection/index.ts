import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioLevel, motionLevel, roomName, timestamp } = await req.json();

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI to analyze the audio pattern
    const prompt = `You are a baby cry detection AI. Based on these sensor readings from a baby monitor, classify the sound:
- Audio level: ${audioLevel} (0-100 scale)
- Motion level: ${motionLevel}% pixel change
- Time: ${timestamp}
- Room: ${roomName}

Rules:
- If audio > 60 and motion > 3: likely "crying"  
- If audio > 40 and audio < 60 and motion > 2: likely "fussing"
- If audio > 30 and motion < 2: likely "babbling"
- If audio < 20 and motion < 1: "sleeping"
- If motion > 5 and audio < 30: "moving"

Respond with ONLY a JSON object: {"classification": "crying|fussing|babbling|sleeping|moving", "confidence": 0.0-1.0, "recommendation": "short advice"}`;

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let classification;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      classification = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        classification: audioLevel > 60 ? "crying" : audioLevel > 30 ? "fussing" : "sleeping",
        confidence: 0.7,
        recommendation: "Check on your baby",
      };
    } catch {
      classification = {
        classification: audioLevel > 60 ? "crying" : audioLevel > 30 ? "fussing" : "sleeping",
        confidence: 0.6,
        recommendation: "Monitoring audio levels",
      };
    }

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[CryDetection] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
