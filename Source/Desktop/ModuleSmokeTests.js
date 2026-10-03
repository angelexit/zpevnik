window.__moduleTest = null;
(async () => {
    try {
        const editor = document.getElementById('editorFrame').contentWindow;
        const editorResult = await editor.eval(`(async () => {
            const {editorState} = await import('/js/tools/editor/state.js');
            const db = await (await fetch('/data/database.json')).json();
            const names = [...new Set(db.map(row => row.file))];
            const files = [];
            for (const name of names) {
                const song = await (await fetch('/data/songs/' + name)).json();
                loadSongObject(song);
                const rebuilt = buildSongObject();
                if (rebuilt.title !== song.title || rebuilt.parts.length !== song.parts.length)
                    throw new Error('Editor roundtrip: ' + name);
                files.push({fileLike: new File([JSON.stringify(song)], name, {type:'application/json', lastModified:0}), rel:name});
            }
            const outputs = {};
            editorState.indexerOutputDirHandle = {getFileHandle:async name => ({createWritable:async()=>({write:async value=>{outputs[name]=await value.text()},close:async()=>{}})})};
            await generateIndexes(files);
            const generated = JSON.parse(outputs['database.json']);
            const artists = JSON.parse(outputs['artists.json']);
            if (generated.length !== names.length || artists.length !== 16) throw new Error('Indexer failed');
            editorState.indexerOutputDirHandle = null;
            return {songs:names.length,indexerSongs:generated.length,indexerArtists:artists.length};
        })()`);
        const exporter = document.getElementById('exportFrame').contentWindow;
        const exportResult = await exporter.eval(`(async () => {
            const {exportState} = await import('/js/tools/export/state.js');
            const db = await (await fetch('/data/database.json')).json();
            const names = [...new Set(db.map(row => row.file))];
            exportState.songsDirHandle = {async *entries(){for(const name of names)yield [name,{kind:'file',getFile:async()=>new File([await (await fetch('/data/songs/'+name)).text()],name,{lastModified:0})}];}};
            await scanSongs();
            const database = makeDatabase(), artists = makeArtists(), report = makeReport();
            if (database.length !== names.length || artists.length !== 16 || !report.includes(String(names.length))) throw new Error('Export failed');
            resetAll();
            if (exportState.loadedSongs.length !== 0) throw new Error('Export reset failed');
            return {songs:database.length,artists:artists.length,reset:true};
        })()`);
        const chords = document.getElementById('chordsFrame').contentWindow;
        chords.document.getElementById('importJson').value = JSON.stringify({C:{t:'C',ps:[{p:1,f:[[6,'x',''],[5,3,'3'],[4,2,'2'],[3,0,''],[2,1,'1'],[1,0,'']],b:[]}]}});
        await chords.importChord();
        if (!chords.document.getElementById('output').value.includes('"C"') || !chords.document.querySelector('#svg-render svg')) throw new Error('Chord import failed');


        openTool('editor');
        const richTests=await editor.eval(`(async()=>{
            const {mountChordText,resetChordHistory,cancelChordMove}=await import('/js/tools/editor/chord-text.js');
            const box=document.createElement('div');box.style.cssText='position:fixed;top:0;left:0;right:0;z-index:999999;background:white;color:black';document.body.append(box);
            const a=document.createElement('textarea'),b=document.createElement('textarea');a.value='A [Cmaj7]text\\n[C#mi] další';b.value='Jsem tady';box.append(a,b);const ea=mountChordText(a),eb=mountChordText(b);resetChordHistory();
            if(ea.textContent.includes('[')||a.value!=='A [Cmaj7]text\\n[C#mi] další')throw new Error('Rich text roundtrip');
            const chip=ea.querySelector('.inline-chord');chip.click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));if(a.value.indexOf('[Cmaj7]')<0||document.querySelector('.floating-chord'))throw new Error('Cancel lost chord');
            chip.dispatchEvent(new PointerEvent('pointerdown',{button:0,clientX:10,clientY:10,bubbles:true}));
            const nativeChipSelection=document.createRange();nativeChipSelection.selectNodeContents(chip);getSelection().removeAllRanges();getSelection().addRange(nativeChipSelection);
            chip.dispatchEvent(new MouseEvent('click',{clientX:10,clientY:10,detail:1,bubbles:true}));
            if(!document.querySelector('.floating-chord'))throw Error('Native chip selection blocks click move');
            const r=document.createRange();r.setStart(eb.firstChild,5);r.collapse(true);const bounds=r.getBoundingClientRect();eb.dispatchEvent(new MouseEvent('click',{clientX:bounds.x,clientY:bounds.y+5,bubbles:true}));
            if(a.value.includes('[Cmaj7]')||b.value!=='Jsem [Cmaj7]tady')throw new Error('Move position: '+a.value+' | '+b.value);
            eb.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));if(!a.value.includes('[Cmaj7]')||b.value!=='Jsem tady')throw new Error('Undo move');
            const restoredChip=ea.querySelector('.inline-chord');
            ea.dispatchEvent(new PointerEvent('pointerdown',{button:0,clientX:0,clientY:0,bubbles:true}));
            document.dispatchEvent(new PointerEvent('pointermove',{clientX:35,clientY:0,bubbles:true}));
            const dragRange=document.createRange();dragRange.selectNodeContents(ea);getSelection().removeAllRanges();getSelection().addRange(dragRange);
            restoredChip.dispatchEvent(new MouseEvent('click',{clientX:35,clientY:0,detail:1,bubbles:true}));
            if(document.querySelector('.floating-chord')||getSelection().isCollapsed)throw Error('Selection drag starts a move');
            const selection=getSelection();const copyRange=document.createRange();copyRange.selectNodeContents(ea);selection.removeAllRanges();selection.addRange(copyRange);const clipboard=new DataTransfer();ea.dispatchEvent(new ClipboardEvent('copy',{clipboardData:clipboard,bubbles:true}));if(clipboard.getData('text/plain')!==a.value)throw new Error('Copy brackets');
            const pasteRange=document.createRange();pasteRange.selectNodeContents(eb);selection.removeAllRanges();selection.addRange(pasteRange);eb.dispatchEvent(new ClipboardEvent('paste',{clipboardData:clipboard,bubbles:true}));if(b.value!==a.value||eb.querySelectorAll('.inline-chord').length!==2)throw new Error('Paste chips');
            const end=document.createRange();end.selectNodeContents(eb);end.collapse(false);selection.removeAllRanges();selection.addRange(end);eb.focus();
            for(const letter of ['[','G',']'])document.execCommand('insertText',false,letter);
            if(!b.value.endsWith('[G]')||eb.querySelectorAll('.inline-chord').length!==3)throw new Error('Typed chord token');
            eb.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));document.execCommand('insertText',false,'New line');if(!b.value.endsWith('[G]\\nNew line'))throw new Error('Newline fidelity '+b.value);
            if(!eb.querySelector('.verse-break'))throw new Error('Missing visible verse marker');
            cancelChordMove();box.remove();resetChordHistory();return {roundtrip:true,moveBetweenSections:true,cancel:true,undo:true,clipboard:true,typing:true,newlines:true};
        })()`);
        const chooserTests=await chords.eval(`(async()=>{
            const {parseChordImport}=await import('/js/tools/chord-editor/import.js');
            const {matchingName}=await import('/js/tools/chord-editor/chooser.js');
            let rejected=false;try{parseChordImport('', '',6);}catch(e){rejected=true;}if(!rejected)throw new Error('Empty import accepted');
            const imported=parseChordImport(JSON.stringify({t:'Cm',ps:[{p:1,f:[[4,3,'1']]}]}),'',4);if(imported.name!=='Cm')throw new Error('Standalone import');
            if(matchingName({Cm:{ps:[]}},'Cmi')!=='Cm')throw new Error('Minor alias');
            document.getElementById('lookupRoot').value='C';document.getElementById('lookupQuality').value='maj7';buildLookupChord();await refreshAvailability();
            if(document.getElementById('lookupName').value!=='Cmaj7'||document.querySelectorAll('#availabilityBody tr').length!==13)throw new Error('Chooser matrix');
            const row=document.querySelector('#availabilityBody tr[data-instrument="gtr_std"]');if(Number(row.dataset.count)<1)throw new Error('Missing existing Cmaj7');
            document.getElementById('lookupName').value='Missing-test-chord';await loadChosenChord('mandolin');if(document.getElementById('chordName').value!=='Missing-test-chord'||document.getElementById('instrument').value!=='mandolin')throw new Error('Missing chord preparation');
            return {matrix:true,quality:true,missingChord:true,emptyImport:true,standaloneImport:true};
        })()`);
        const diskTests=await editor.eval(`(async()=>{
            const {api}=await import('/js/core/desktop-api.js');const {editorState:s}=await import('/js/tools/editor/state.js');const {rememberEditor}=await import('/js/tools/editor/files.js');
            document.getElementById('songSelect').value='anna_k-nebe.json';await autoLoadSelectedSong();
            const original=buildSongObject();const revision=s.revision;
            document.querySelector('.section-card textarea').value+='\\nIntegration test edit';
            const saved=await saveSongDirect();if(!saved)throw new Error('Existing song save');
            const disk=await api('read?path=songs/anna_k-nebe.json');if(!disk.value.parts[0].text.includes('Integration test edit'))throw new Error('Saved text missing');
            let conflict=false;try{await api('song',{file:'anna_k-nebe.json',revision,song:original});}catch(e){conflict=true;}if(!conflict)throw new Error('Stale overwrite accepted');
            let traversal=false;try{await api('song',{file:'../escape.json',revision:'',song:original});}catch(e){traversal=true;}if(!traversal)throw new Error('Traversal accepted');
            s.currentSongPath='';s.revision='';loadSongObject({...original,title:'Automatický test nové písně',customField:{keep:true}});
            const added=await saveSongDirect();if(!added)throw new Error('New song save');
            const library=await api('library');if(!library.database.some(r=>r.file===added.file))throw new Error('New song not indexed');
            const newDisk=await api('read?path='+encodeURIComponent('songs/'+added.file));if(!newDisk.value.customField.keep)throw new Error('Custom fields dropped');
            s.currentSongPath='';s.revision='';const collision=await saveSongDirect();if(collision!==null)throw new Error('Collision accepted');
            s.currentSongPath=added.file;s.revision=added.revision;
            document.querySelector('.section-card textarea').value+='\\nUnsaved persistent draft';rememberEditor();
            const draft=JSON.parse(localStorage.getItem('zpevnik-editor:'+library.id));if(!draft.song.parts[0].text.includes('Unsaved persistent draft'))throw new Error('Draft not saved');
            return {existing:true,newSong:added.file,conflict,collision:true,traversal,unknownFields:true,draft:true};
        })()`);
        const chordTests=await chords.eval(`(async()=>{
            const {api}=await import('/js/core/desktop-api.js');const {chordState}=await import('/js/tools/chord-editor/state.js');
            document.getElementById('instrument').value='gtr_std';await changeChordLibrary();
            document.getElementById('databaseChord').value='C';selectDatabaseChord();
            const before=await api('read?path=chords/guitar-standard.json');
            chordState.chordData.points[0].p='T';updateAll();await saveDatabaseChord();
            const after=await api('read?path=chords/guitar-standard.json');
            if(before.revision===after.revision)throw new Error('Chord did not save');
            if(JSON.stringify(before.value.G)!==JSON.stringify(after.value.G))throw new Error('Other chord changed');
            if(JSON.stringify(before.value.C.ps.slice(1))!==JSON.stringify(after.value.C.ps.slice(1)))throw new Error('Other positions changed');
            newDatabaseChord();document.getElementById('chordName').value='Test chord';chordState.chordData.points=[{s:1,f:15,p:'1'}];document.getElementById('startFret').value=13;shiftFretboard();updateAll();await saveDatabaseChord();
            const added=await api('read?path=chords/guitar-standard.json');if(added.value['Test chord'].ps[0].f[0][1]!==15)throw new Error('High fret save');
            addChordPosition();chordState.chordData.points=[{s:1,f:17,p:'2'}];updateAll();await saveDatabaseChord();
            document.getElementById('chordPosition').value='0';selectChordPosition();chordState.chordData.points[0].p='3';updateAll();await saveDatabaseChord();
            const variants=await api('read?path=chords/guitar-standard.json');if(variants.value['Test chord'].ps.length!==2||variants.value['Test chord'].ps[1].f[0][1]!==17)throw new Error('Multiple variants not preserved');
            return {existing:true,newChord:true,otherChordsPreserved:true,otherPositionsPreserved:true,multipleVariants:true,highFrets:true};
        })()`);
        const chordFrame=document.getElementById('chordsFrame');chordFrame.contentWindow.location.reload();
        await new Promise((resolve,reject)=>{let tries=0;const timer=setInterval(()=>{if(chordFrame.contentWindow.__chordLibraryReady){clearInterval(timer);resolve();}else if(++tries>150){clearInterval(timer);reject(new Error('Chord reconnect'));}},100);});
        if(chordFrame.contentDocument.getElementById('chordName').value!=='Test chord'||chordFrame.contentDocument.getElementById('chordPosition').options.length!==2)throw new Error('Chord selection lost');
        // Actual iframe navigation must restore the selected file and unsaved draft.
        const frame=document.getElementById('editorFrame');frame.contentWindow.location.reload();
        await new Promise((resolve,reject)=>{let tries=0;const timer=setInterval(()=>{if(frame.contentWindow.__libraryReady){clearInterval(timer);resolve();}else if(++tries>150){clearInterval(timer);reject(new Error('Editor reconnect'));}},100);});
        if(!frame.contentWindow.buildSongObject().parts[0].text.includes('Unsaved persistent draft'))throw new Error('Draft lost on navigation');
        const preview=frame.contentWindow.buildSongObject();
        const previewKey='zpevnik-preview:test';localStorage.setItem(previewKey,JSON.stringify(preview));
        const previewFrame=document.createElement('iframe');previewFrame.src='/index.html?preview='+previewKey;document.body.append(previewFrame);
        await new Promise((resolve,reject)=>{let tries=0;const timer=setInterval(()=>{if(previewFrame.contentDocument?.querySelector('.song-section-card')){clearInterval(timer);resolve();}else if(++tries>150){clearInterval(timer);reject(new Error('Preview load'));}},100);});
        if(!previewFrame.contentDocument.body.textContent.includes('Unsaved persistent draft'))throw new Error('Preview missing draft');previewFrame.remove();
        const gh=exporter.document;
        if(!gh.getElementById('ghDownload')||!gh.getElementById('ghPublish').disabled)throw new Error('Sync UI initial state');
        const originalFetch=exporter.fetch;let sent=false,pulled=false,checkCount=0,projectChecked=false;
        exporter.fetch=async(url,options)=>{
            if(!String(url).startsWith('/api/github/'))return originalFetch(url,options);
            const action=String(url).split('/').pop();let result;
            if(action==='settings')result={settings:{},hasToken:true};
            else if(action==='status')result={progress:''};
            else if(action==='preview')result={path:'songs/test.json',isJson:true,local:'local version',remote:'remote version'};
            else if(action==='check'){if(JSON.parse(options.body).scope==='project')projectChecked=true;checkCount++;result={planId:'test-plan',target:'test/repo',changes:[{path:'songs/test.json',action:checkCount===1?'conflict':'upload'}],unchanged:2,conflicts:checkCount===1?1:0,uploads:1,downloads:1,warnings:[],hasToken:true};}
            else {const body=JSON.parse(options.body);if(body.planId!=='test-plan')throw new Error('Wrong plan');if(action==='download'){if(body.choices['songs/test.json']!=='remote')throw new Error('Wrong conflict choice');pulled=true;}else sent=true;result={message:'Test synchronized',ok:true,localApplied:true};}
            return {ok:true,json:async()=>result};
        };
        try {
            gh.getElementById('ghOwner').value='test';gh.getElementById('ghRepo').value='repo';
            gh.getElementById('ghCheck').click();await new Promise(r=>setTimeout(r,100));
            if(!gh.getElementById('ghPublish').disabled||!gh.getElementById('ghDownload').disabled)throw new Error('Unresolved conflict allowed');
            gh.querySelector('#ghChanges button').click();await new Promise(r=>setTimeout(r,100));
            if(!gh.getElementById('ghLocalPreview').textContent.includes('local version'))throw new Error('Missing preview');gh.getElementById('ghClosePreview').click();
            const choice=gh.querySelector('#ghChanges select');choice.value='remote';choice.dispatchEvent(new exporter.Event('change'));
            if(gh.getElementById('ghDownload').disabled)throw new Error('Resolved conflict still blocked');
            gh.getElementById('ghDownload').click();await new Promise(r=>setTimeout(r,100));
            if(!pulled||sent)throw new Error('Download posted publish');
            gh.getElementById('ghCheck').click();await new Promise(r=>setTimeout(r,100));gh.getElementById('ghPublish').click();await new Promise(r=>setTimeout(r,100));
            if(!sent||!gh.getElementById('ghPublish').disabled)throw new Error('Sync UI failed');
            gh.getElementById('ghScope').value='project';gh.getElementById('ghScope').dispatchEvent(new exporter.Event('change'));
            if(!gh.getElementById('ghDownload').disabled||!gh.getElementById('ghScopeHelp').textContent.includes('Source'))throw new Error('Project scope invalidation');
            gh.getElementById('ghCheck').click();await new Promise(r=>setTimeout(r,100));if(!projectChecked)throw new Error('Project scope request');
        } finally {exporter.fetch=originalFetch;gh.getElementById('ghScope').value='data';gh.getElementById('ghScope').dispatchEvent(new exporter.Event('change'));gh.getElementById('ghOwner').value='';gh.getElementById('ghRepo').value='';gh.getElementById('ghChanges').replaceChildren();gh.getElementById('ghWarnings').replaceChildren();gh.getElementById('ghResult').replaceChildren();gh.getElementById('ghReload').hidden=true;gh.getElementById('ghStatus').textContent='Nastav repozitář a porovnej změny.';gh.getElementById('ghSettingsStatus').textContent='Token není vyplněný.';}
        const originalMainFetch=window.fetch;
        try {
            window.fetch=async(url)=>({ok:true,json:async()=>String(url).endsWith('settings')?{settings:{owner:'test',repo:'songs',branch:'main',checkOnOpen:true}}:{conflicts:1,downloads:0,uploads:0}});
            const {checkSyncOnOpen}=await import('/js/app/sync-notice.js');await checkSyncOnOpen();
            if(!document.querySelector('.sync-notice')?.textContent.includes('konflikt'))throw new Error('Startup sync notice');
            document.querySelector('.sync-notice').remove();
        } finally {window.fetch=originalMainFetch;}
        window.openTool('chords');
        const cd=chords.document, beforeMirror=cd.getElementById('output').value;
        const firstCell=cd.querySelector('.string-col .fret-cell'),lastCell=cd.querySelector('.string-col').lastElementChild;
        if(firstCell.getBoundingClientRect().left>=lastCell.getBoundingClientRect().left)throw Error('Right-handed layout');
        cd.getElementById('editorHand').value='left';chords.setEditorHand();
        if(firstCell.getBoundingClientRect().left<=lastCell.getBoundingClientRect().left)throw Error('Left-handed layout');
        if(cd.getElementById('output').value!==beforeMirror)throw Error('Mirror modified chord');
        cd.getElementById('editorHand').value='right';chords.setEditorHand();
        if(!cd.getElementById('output').hidden||!cd.querySelector('.note-tone'))throw Error('Compact editor labels');
        cd.getElementById('startFret').value='1';chords.shiftFretboard();
        if(cd.querySelectorAll('.neck-marker').length!==5||!cd.querySelector('.double-marker[data-fret=\"12\"]'))throw Error('Neck markers');
        await editor.eval(`(async()=>{
          const real=window.fetch;const d=document;let stage='search';
          window.fetch=async(url,opts)=>{if(!String(url).startsWith('/api/discogs/'))return real(url,opts);const action=String(url).split('/').pop();return {ok:true,json:async()=>action==='search'?{results:[{id:42,title:'Ilona Csáková'}],pagination:{page:1,pages:1}}:action==='albums'?{releases:[{id:127620,title:'Amsterdam',year:1995,type:'master'}],pagination:{page:1,pages:1}}:{title:'Amsterdam',year:1995,genres:['Pop'],styles:['Europop'],uri:'https://www.discogs.com/master/127620',images:[],tracklist:[{type_:'heading',title:'Strana A'},{position:'A1',title:'Amsterdam',duration:'4:13',sub_tracks:[{position:'A1a',title:'Intro',duration:''}]}]}};};
          const wait=async(fn)=>{for(let i=0;i<100&&!fn();i++)await new Promise(r=>setTimeout(r,20));if(!fn())throw Error('Discogs UI timeout');};
          try{
            const before=d.getElementById('artist').value;
            d.getElementById('discogsQuery').value='Ilona Csáková';d.getElementById('discogsSearch').click();
            await wait(()=>d.getElementById('discogsResults').querySelector('button'));
            d.getElementById('discogsResults').querySelector('button').click();
            await wait(()=>d.getElementById('discogsResults').textContent.includes('Amsterdam'));
            d.getElementById('discogsResults').querySelector('button').click();
            await wait(()=>d.getElementById('discogsDetail').querySelector('button'));
            d.getElementById('discogsDetail').querySelectorAll('input')[2].checked=true;
            d.getElementById('discogsDetail').querySelector('button').click();
            await wait(()=>d.getElementById('discogsStatus').textContent.includes('Vybrané údaje'));
            const tracklist=d.querySelector('.discogs-tracklist');if(!tracklist||tracklist.querySelectorAll('tbody tr').length!==3||!tracklist.textContent.includes('4:13')||!tracklist.textContent.includes('Intro'))throw Error('Discogs tracklist');const song=buildSongObject();if(song.album!=='Amsterdam'||String(song.year)!=='1995'||song.genres[0]!=='Pop'||song.discogs.id!==127620||song.artist!==before)throw Error('Discogs confirmed import');
            const picker=d.getElementById('discogsSongSelect');if(picker.hidden||picker.options.length!==3)throw Error('Song dropdown');picker.value='0';picker.dispatchEvent(new Event('change'));if(d.getElementById('title').value!=='Amsterdam')throw Error('Song title selection');
            const manual=d.getElementById('manualChords');manual.value='C, G Ami Fmaj7 invalid';manual.dispatchEvent(new Event('input',{bubbles:true}));
            if(!d.querySelector('.section-card .used-row').textContent.includes('Fmaj7')||!d.getElementById('manualChordStatus').textContent.includes('invalid'))throw Error('Manual chord palette');
            const saved=buildSongObject();if(saved.editor_chords.length!==4)throw Error('Manual chord persistence');loadSongObject(saved);if(!d.getElementById('manualChords').value.includes('Fmaj7')||d.getElementById('discogsSongSelect').hidden)throw Error('Editor extras restore');
            const cache=d.getElementById('cacheOutput');cache.value='[Ami]První verš\\n[G]Druhý verš';
            if(cache.hidden||cache.style.display==='none'||cache.nextElementSibling.classList.contains('chord-text'))throw Error('Cache must remain plain text');
            const data=new DataTransfer();data.setData('text/plain',cache.value);
            const destination=d.querySelector('.section-card .chord-text');const destRange=d.createRange();destRange.selectNodeContents(destination);getSelection().removeAllRanges();getSelection().addRange(destRange);destination.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:data}));if(d.querySelector('.section-card textarea').value!==cache.value)throw Error('Chord paste roundtrip');
            const cutRange=d.createRange();cutRange.selectNodeContents(destination);getSelection().removeAllRanges();getSelection().addRange(cutRange);destination.dispatchEvent(new ClipboardEvent('cut',{bubbles:true,clipboardData:data}));if(d.querySelector('.section-card textarea').value!=='')throw Error('Final editor cut');
            const pasteRange=d.createRange();pasteRange.selectNodeContents(destination);getSelection().removeAllRanges();getSelection().addRange(pasteRange);destination.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:data}));if(d.querySelector('.section-card textarea').value!==cache.value)throw Error('Cut paste preserves chords and verses');
            const controls=cache.nextElementSibling;controls.querySelector('select').focus();cache.setSelectionRange(0,0);const transfer=[...controls.querySelectorAll('button')].find(b=>b.textContent.includes('Vložit výběr'));transfer.click();if(!d.querySelector('.section-card textarea').value.includes('[Ami]'))throw Error('Direct section transfer');
            const beforeText=d.querySelector('.section-card textarea').value;const chordButton=[...d.querySelectorAll('.section-card .used-btn')].find(b=>b.textContent.trim()==='Fmaj7');chordButton.click();if(!d.querySelector('.section-card textarea').value.includes('[Fmaj7]'))throw Error('Manual chord insertion');
            const {parseSections}=await import('/js/tools/editor/section-import.js');
            const parsed=parseSections('1. [D]První\\n   další\\n\\nR: [G]Refrén\\n3. [Ami]Třetí\\nR. Další\\nR@ Jiný\\nREF: Konec');
            if(parsed.length!==6||parsed[0].text!=='[D]První\\ndalší'||parsed[1].type!=='chorus'||parsed[2].type!=='verse'||parsed.slice(3).some(x=>x.type!=='chorus'))throw Error('Section marker parser');
            const previousCards=d.querySelectorAll('.section-card').length;
            cache.value='1. [D]Sloka\\n\\nR: [G]Refrén';cache.setSelectionRange(0,0);
            await [...controls.querySelectorAll('button')].find(b=>b.textContent.startsWith('Rozdělit')).onclick();
            if(d.querySelectorAll('.section-card').length!==previousCards+2)throw Error('Section split count');
            const parts=buildSongObject().parts;
            if(!parts.some(p=>p.type==='chorus'))throw Error('Section split type');
            const {parseTokenFile}=await import('/js/tools/shared/token-file.js');if(parseTokenFile(' {"discogs":"fake-token-123","github":"fake-github-123"} ','github')!=='fake-github-123'||parseTokenFile('fake-token-123','discogs')!=='fake-token-123')throw Error('Token file parser');let rejected=false;try{parseTokenFile('{bad','discogs')}catch{rejected=true}if(!rejected)throw Error('Invalid token file accepted');

          }finally{window.fetch=real;}
        })()`);
        window.__moduleTest = {ok:true,editor:editorResult,export:exportResult,chordImport:true,richTests,chooserTests,diskTests,chordTests,navigationPersistence:true,preview:true,githubUI:true,syncConflictUI:true,pullUI:true,startupSyncNotice:true,projectScopeUI:true};
    } catch (error) { window.__moduleTest = {ok:false,error:String(error),stack:error.stack}; }
})();
