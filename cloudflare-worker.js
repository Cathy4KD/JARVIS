/**
 * JARVIS Cloudflare Worker
 * Proxy pour contourner CORS et appeler Claude API
 *
 * INSTRUCTIONS DE DÉPLOIEMENT:
 * 1. Allez sur https://dash.cloudflare.com/
 * 2. Créez un compte gratuit si nécessaire
 * 3. Allez dans "Workers & Pages"
 * 4. Cliquez "Create Worker"
 * 5. Collez ce code
 * 6. Allez dans Settings > Variables
 * 7. Ajoutez: ANTHROPIC_API_KEY = votre-clé-api
 * 8. Déployez et copiez l'URL (ex: jarvis-proxy.votrenom.workers.dev)
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS (preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'online',
        service: 'JARVIS Cloudflare Worker'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Chat endpoint
    if (url.pathname === '/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        const userMessage = body.message;

        if (!userMessage) {
          return new Response(JSON.stringify({ error: 'No message' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Appeler Claude API
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: `Tu es JARVIS, l'assistant virtuel intelligent de Madame.
Tu parles en français avec élégance et respect.
Tu es efficace, concis et serviable.

Pour les commandes Kitting, réponds avec un JSON action:
- Créer: {"action": "create_kitting", "ordre": "123456", "zone": "F"}
- Lister: {"action": "list_kittings"}
- Incomplets: {"action": "incomplete_kits"}

Pour les commandes Arrêt Annuel / Travaux (Cath's Eyes), réponds avec un JSON action:
- Lister travaux: {"action": "list_travaux"}
- Travaux en cours: {"action": "travaux_en_cours"}
- Travaux terminés: {"action": "travaux_termines"}
- Pièces manquantes: {"action": "pieces_manquantes"}
- Statistiques arrêt: {"action": "stats_arret"}

Pour les autres demandes, réponds naturellement et brièvement.`,
            messages: [{ role: 'user', content: userMessage }]
          })
        });

        const claudeData = await claudeResponse.json();

        if (claudeData.content && claudeData.content[0]) {
          return new Response(JSON.stringify({
            success: true,
            response: claudeData.content[0].text
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({
            error: claudeData.error?.message || 'Claude error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('JARVIS Worker - Use /chat endpoint', {
      headers: corsHeaders
    });
  }
};
