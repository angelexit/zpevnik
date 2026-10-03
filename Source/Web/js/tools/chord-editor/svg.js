import {renderDiagram} from '../../chords/diagram.js';
export function renderNativeSVG(name,pos,barres,inst){document.getElementById('svg-render').innerHTML=renderDiagram(name,{...pos,b:barres},inst);}
