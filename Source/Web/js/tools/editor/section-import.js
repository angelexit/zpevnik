// Import markers are stripped only at the start of a line; chord notation stays intact.
export function parseSections(value) {
 const result = []; let lines = [], type = 'verse';
 const flush = () => { if (lines.some(x => x.trim())) result.push({type,text:lines.join('\n').trim()}); lines = []; };
 for (const raw of String(value).replace(/\r\n?/g,'\n').replace(/↵/g,'\n').split('\n')) {
  const line = raw.trim();
  if (!line) { flush(); type = 'verse'; continue; }
  const chorus = line.match(/^(?:R|REF|REFRÉN|REFREN|CHORUS)\s*[:.@)\-]\s*/i) || line.match(/^(?:REFRÉN|REFREN|CHORUS)\s*$/i);
  const verse = line.match(/^\d+\s*[.)]\s*/);
  const marker = chorus || verse;
  if (marker) { flush(); type = chorus ? 'chorus' : 'verse'; const rest = line.slice(marker[0].length).trimStart(); if (rest) lines.push(rest); }
  else lines.push(line);
 }
 flush(); return result;
}
