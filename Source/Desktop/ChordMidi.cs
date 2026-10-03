using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
namespace Zpevnik;
sealed class ChordMidi : IDisposable
{
    [DllImport("winmm.dll", CharSet=CharSet.Unicode, EntryPoint="mciSendStringW")]
    static extern uint Send(string command, StringBuilder? result, int size, IntPtr callback);
    readonly Dictionary<string,byte[]> assets;
    readonly string library;
    readonly string previewFile=Path.Combine(Path.GetTempPath(),"zp-"+Guid.NewGuid().ToString("N")[..12]+".mid");
    public ChordMidi(Dictionary<string,byte[]> assets,string library) { this.assets=assets;this.library=library; }
    public static string? FileName(string chord)
    {
        var match=Regex.Match(chord.Trim(),@"^([A-H](?:#|b|♯|♭)?)([a-zA-Z0-9+_-]*)$");
        if(!match.Success)return null;
        var root=match.Groups[1].Value.Replace("♯","#").Replace("♭","b");
        root=root switch {"C#" or "Db"=>"C.","D#"=>"Eb","F#" or "Gb"=>"F.","G#" or "Ab"=>"G.","A#" or "Bb"=>"B","Cb"=>"H","Fb"=>"E","E#"=>"F","H#"=>"C",_=>root};
        var suffix=match.Groups[2].Value;
        if(suffix=="sus4")suffix="sus";
        return root+suffix+".mid";
    }
    public object Play(string chord, bool previewOnly=false)
    {
        Stop();
        var name=FileName(chord);if(name==null)return new {ok=false,message="Pro tento akord není zvuk k dispozici."};
        byte[]? data=null;
        var local=Path.Combine(library,"audio","midi",name);
        if(File.Exists(local) && new FileInfo(local).Length <= 2000000) data=File.ReadAllBytes(local);
        if(data==null)assets.TryGetValue("audio/midi/"+name,out data);
        if(data==null || data.Length<14 || Encoding.ASCII.GetString(data,0,4)!="MThd")return new {ok=false,message="Pro tento akord není zvuk k dispozici."};
        // The Windows sequencer cannot open long paths. Use a short, private temporary name.
        var file=previewFile;File.WriteAllBytes(file,data);
        if(Send($"open \"{file}\" type sequencer alias chordPreview",null,0,IntPtr.Zero)!=0)return new {ok=false,message="Windows nemůže otevřít MIDI zvuk."};
        if(previewOnly) { Stop();return new {ok=true}; }
        if(Send("play chordPreview from 0",null,0,IntPtr.Zero)!=0) { Stop();return new {ok=false,message="MIDI zvuk se nepodařilo přehrát."}; }
        return new {ok=true};
    }
    public void Stop() { Send("stop chordPreview",null,0,IntPtr.Zero);Send("close chordPreview",null,0,IntPtr.Zero); }
    public void Dispose() { Stop();try { File.Delete(previewFile); } catch { } }
}
