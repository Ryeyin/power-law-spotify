const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'artists_deduped.csv');
const outPath = path.join(__dirname, '..', 'constants', 'artistsData.json');

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split(/\r?\n/);

const images = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
];

function parseCsvRow(row) {
  if (!row.trim()) return null;
  
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());

  if (parts.length < 3) return null;

  const name = parts[0];
  const followers = parseFloat(parts[1]) || 0;
  const popularity = parseFloat(parts[2]) || 0;
  
  let rawGenres = parts[3] || '[]';
  if (rawGenres.startsWith('"') && rawGenres.endsWith('"')) {
    rawGenres = rawGenres.slice(1, -1);
  }
  
  let genres = [];
  try {
    const jsonStr = rawGenres.replace(/'/g, '"');
    genres = JSON.parse(jsonStr);
  } catch (e) {
    genres = rawGenres.replace(/[\[\]']/g, '').split(',').map(g => g.trim()).filter(Boolean);
  }

  return { name, followers, popularity, genres };
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const artists = [];
for (let i = 1; i < lines.length; i++) {
  const item = parseCsvRow(lines[i]);
  if (!item || !item.name || item.name === 'artist_name') continue;

  const followers = Math.max(Math.round(item.followers), 10);
  const listeners = Math.round(followers * 1.6);
  const playcount = Math.round(listeners * 15);

  const listenerScore = Math.min(Math.max(Math.log10(listeners) / 8.5, 0), 1);
  const playScore = Math.min(Math.max(Math.log10(playcount) / 10, 0), 1);
  const fanScore = 0.6;
  const rawScore = 70 * (1 - listenerScore) + 20 * playScore + 10 * fanScore;
  const score = Math.min(Math.max(Math.round(rawScore), 1), 99);

  // Exclude score < 40
  if (score < 40) continue;

  let category = 'rising_star';
  let label = 'Rising Star';
  let color = '#F59E0B';
  let bgLight = 'rgba(245, 158, 11, 0.15)';

  if (score >= 70) {
    category = 'underground';
    label = 'Underground';
    color = '#14B8A6';
    bgLight = 'rgba(20, 184, 166, 0.15)';
  }

  const h = hashCode(item.name + i);
  // Continuous base price formula for varied pricing with decimal places
  const fanRatio = playcount / Math.max(listeners, 1);
  const basePriceVal = (score * 1.65) + (fanRatio * 0.35) + ((h % 97) * 0.13);
  const basePrice = Math.max(12, Math.min(220, Math.round(basePriceVal * 10) / 10));

  // Market Sentiment & Listener Growth Formula
  // newPrice = oldPrice * (1 + listenerGrowth * 0.7) * (1 + random(-0.02, 0.02))
  const listenerGrowth = Math.sin((h % 100) * 0.15) * 0.08; // -8% to +8%
  const marketNoise = Math.cos((h % 100) * 0.23) * 0.04 - 0.005; // -4.5% to +3.5%
  const growthMultiplier = (1 + listenerGrowth * 0.7) * (1 + marketNoise);
  
  const currentPrice = Math.max(8, Math.round(basePrice * growthMultiplier * 10) / 10);
  let percentChange = Math.round(((currentPrice - basePrice) / basePrice) * 1000) / 10;
  if (percentChange === 0) percentChange = 1.4;

  const imgUrl = images[i % images.length];

  artists.push({
    id: 'artist-' + i,
    name: item.name,
    listeners,
    playcount,
    popularity: Math.round(item.popularity),
    genres: item.genres.length > 0 ? item.genres : ['indie', 'alternative'],
    discoveryScore: score,
    badge: { category, label, color, bgLight },
    price: currentPrice,
    basePrice,
    percentChange,
    imageUrl: imgUrl,
  });
}

// Sort all artists by price descending (most expensive on top)!
artists.sort((a, b) => b.price - a.price);

fs.writeFileSync(outPath, JSON.stringify(artists, null, 2), 'utf8');
console.log(`Successfully generated and sorted ${artists.length} artists by price descending!`);
