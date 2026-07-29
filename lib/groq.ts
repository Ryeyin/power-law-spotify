const GROQ_API_KEY = (process.env.EXPO_PUBLIC_GROQ_API_KEY || '').trim();
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface PlaylistPreferences {
  genres: string[];
  favoriteArtists: string[];
  /** Artists the user currently holds in their portfolio */
  investedArtists?: string[];
  mood: string;
  length: number;
}

export interface SuggestedSong {
  artist: string;
  song: string;
}

/**
 * Ask Groq for real song recommendations (artist + song title).
 * Returns [] if no API key / request fails.
 */
export async function generatePlaylistSongs(
  prefs: PlaylistPreferences
): Promise<SuggestedSong[]> {
  if (!GROQ_API_KEY || GROQ_API_KEY.includes('your_')) {
    return [];
  }

  const trackTarget = Math.max(8, Math.min(prefs.length || 12, 24));
  const invested = prefs.investedArtists?.filter(Boolean) || [];
  const favorites = prefs.favoriteArtists?.filter(Boolean) || [];
  const seedArtists = [...new Set([...invested, ...favorites])];

  const prompt = `You are a music curator. Recommend exactly ${trackTarget} real songs (existing recorded tracks).

Rules:
- Prefer genres: ${prefs.genres.join(', ') || 'indie, alternative'}
- Mood: ${prefs.mood || 'chill'}
${seedArtists.length ? `- Include several songs by or strongly related to these artists the user likes/owns: ${seedArtists.join(', ')}` : ''}
- Mix familiar picks with discoveries in the same vibe
- Use real song titles only (no placeholders like "Top Anthem" or "Midnight Session")
- Avoid duplicate songs

Respond with ONLY a JSON array of objects like:
[{"artist":"Artist Name","song":"Exact Song Title"}]
No markdown.`;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content:
              'Return only a valid JSON array of {artist, song} objects with real music. No markdown fences.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 900,
      }),
    });

    if (!res.ok) {
      console.warn('Groq HTTP error', res.status);
      return [];
    }
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || '[]';
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((row: any) => ({
        artist: String(row.artist || row.Artist || '').trim(),
        song: String(row.song || row.title || row.Song || '').trim(),
      }))
      .filter((row: SuggestedSong) => row.artist && row.song)
      .slice(0, trackTarget);
  } catch (e) {
    console.warn('Groq generatePlaylistSongs error:', e);
    return [];
  }
}

/** @deprecated Prefer generatePlaylistSongs — kept for compatibility */
export async function generatePlaylistArtists(
  prefs: PlaylistPreferences
): Promise<string[]> {
  const songs = await generatePlaylistSongs(prefs);
  return [...new Set(songs.map((s) => s.artist))];
}
