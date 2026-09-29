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
            chip.click();const r=document.createRange();r.setStart(eb.firstChild,5);r.collapse(true);const bounds=r.getBoundingClientRect();eb.dispatchEvent(new MouseEvent('click',{clientX:bounds.x,clientY:bounds.y+5,bubbles:true}));
            if(a.value.includes('[Cmaj7]')||b.value!=='Jsem [Cmaj7]tady')throw new Error('Move position: '+a.value+' | '+b.value);
            eb.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));if(!a.value.includes('[Cmaj7]')||b.value!=='Jsem tady')throw new Error('Undo move');
            const selection=getSelection();const copyRange=document.createRange();copyRange.selectNodeContents(ea);selection.removeAllRanges();selection.addRange(copyRange);const clipboard=new DataTransfer();ea.dispatchEvent(new ClipboardEvent('copy',{clipboardData:clipboard,bubbles:true}));if(clipboard.getData('text/plain')!==a.value)throw new Error('Copy brackets');
            const pasteRange=document.createRange();pasteRange.selectNodeContents(eb);selection.removeAllRanges();selection.addRange(pasteRange);eb.dispatchEvent(new ClipboardEvent('paste',{clipboardData:clipboard,bubbles:true}));if(b.value!==a.value||eb.querySelectorAll('.inline-chord').length!==2)throw new Error('Paste chips');
            const end=document.createRange();end.selectNodeContents(eb);end.collapse(false);selection.removeAllRanges();selection.addRange(end);eb.focus();
            for(const letter of ['[','G',']'])document.execCommand('insertText',false,letter);
            if(!b.value.endsWith('[G]')||eb.querySelectorAll('.inline-chord').length!==3)throw new Error('Typed chord token');
            eb.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));document.execCommand('insertText',false,'New line');if(!b.value.endsWith('[G]\\nNew line'))throw new Error('Newline fidelity '+b.value);
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
        window.__moduleTest = {ok:true,editor:editorResult,export:exportResult,chordImport:true,richTests,chooserTests,diskTests,chordTests,navigationPersistence:true,preview:true};
    } catch (error) { window.__moduleTest = {ok:false,error:String(error),stack:error.stack}; }
})();
