// Open-string names use international B; displayed notes use Czech H/B.
const pitches={C:0,D:2,E:4,F:5,G:7,A:9,B:11,H:11};
export function soundingNote(tuning,string,fret){
 const open=tuning[tuning.length-Number(string)];
 if(!open||!Number.isFinite(Number(fret))||Number(fret)<0)return '';
 const match=open.match(/^([A-H])([#b]?)$/);if(!match)return '';
 const pitch=pitches[match[1]]+(match[2]==='#'?1:match[2]==='b'?-1:0)+Number(fret);
 return ['C','C#','D','D#','E','F','F#','G','G#','A','B','H'][((pitch%12)+12)%12];
}

const standard=['E','A','D','G','B','E'];
export function instrumentTuning(instrument,tuning){
 const sets={guitar:{standard,guitar7:['B',...standard],dropd:['D','A','D','G','B','E'],dropc:['C','G','C','F','A','D'],opend:['D','A','D','F#','A','D'],openc:['C','G','C','G','C','E'],openg:['D','G','D','G','B','D']},ukulele:{standard:['G','C','E','A'],baritone:['D','G','B','E']},mandolin:{standard:['G','D','A','E']},banjo:{banjo5:['G','D','G','B','D'],banjo6:standard,tenor:['C','G','D','A']},bass:{bass4:['E','A','D','G'],bass5:['B','E','A','D','G']}};
 return sets[instrument]?.[tuning]||[];
}
