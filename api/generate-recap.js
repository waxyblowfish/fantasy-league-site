// Vercel Serverless Function for AI Recap Generation
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { matchupData, week } = await request.json();

    // You'll need to add your Anthropic API key as an environment variable in Vercel
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Fallback to template-based recap if no API key is set
      return new Response(JSON.stringify({
        recap: generateTemplateRecap(matchupData, week)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a witty fantasy football commentator. Write a funny, engaging 2-3 paragraph recap of Week ${week} results. Make it entertaining with light trash talk, highlight the biggest blowout, closest game, and any funny observations. Keep it fun and playful.

Here are the results:
${matchupData.map(m => `${m.team1} ${m.team1Score} vs ${m.team2} ${m.team2Score} (Winner: ${m.winner}, Margin: ${m.margin})`).join('\n')}

Write the recap in a conversational, humorous tone.`
        }]
      })
    });

    const data = await response.json();
    const recapText = data.content?.find(c => c.type === 'text')?.text || generateTemplateRecap(matchupData, week);

    return new Response(JSON.stringify({ recap: recapText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating recap:', error);
    
    // Return template-based recap as fallback
    const { matchupData, week } = await request.json();
    return new Response(JSON.stringify({
      recap: generateTemplateRecap(matchupData, week)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Template-based recap generator (fallback when no API key)
function generateTemplateRecap(matchupData, week) {
  if (!matchupData || matchupData.length === 0) {
    return `Week ${week} is in the books! Check back soon for a detailed recap.`;
  }

  // Find biggest blowout
  const blowout = matchupData.reduce((max, m) => 
    parseFloat(m.margin) > parseFloat(max.margin) ? m : max
  );

  // Find closest game
  const closest = matchupData.reduce((min, m) => 
    parseFloat(m.margin) < parseFloat(min.margin) ? m : min
  );

  // Find highest scoring game
  const highScoring = matchupData.reduce((max, m) => {
    const total = parseFloat(m.team1Score) + parseFloat(m.team2Score);
    const maxTotal = parseFloat(max.team1Score) + parseFloat(max.team2Score);
    return total > maxTotal ? m : max;
  });

  return `Week ${week} Recap

What a week! ${blowout.winner} absolutely dominated with a ${blowout.margin}-point victory over ${blowout.winner === blowout.team1 ? blowout.team2 : blowout.team1}. Meanwhile, ${closest.winner} squeaked by in the closest matchup of the week, edging out ${closest.winner === closest.team1 ? closest.team2 : closest.team1} by just ${closest.margin} points.

The highest-scoring game featured ${highScoring.team1} and ${highScoring.team2}, combining for ${(parseFloat(highScoring.team1Score) + parseFloat(highScoring.team2Score)).toFixed(2)} points. ${highScoring.winner} came out on top in that shootout.

That's a wrap on Week ${week}! On to the next one.`;
}
