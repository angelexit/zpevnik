namespace Zpevnik;

// Application sources are compared separately, always relative to the repository root.
static class ProjectFiles
{
    static readonly HashSet<string> Extensions=new(StringComparer.OrdinalIgnoreCase){".cs",".csproj",".props",".targets",".ps1",".js",".mjs",".cjs",".json",".html",".css",".md",".txt",".cmd",".bat",".svg",".png",".jpg",".jpeg",".webp",".ico",".woff",".woff2",".ttf",".otf"};
    static readonly HashSet<string> Excluded=new(StringComparer.OrdinalIgnoreCase){"bin","obj","node_modules",".git",".vs",".backups",".sync",".github","packages"};
    internal static bool DirectoryAllowed(string path)
    {
        var parts=path.Split('/');return parts.Length>0&&(parts[0]=="Source"||parts[0]=="Licenses")&&!parts.Any(p=>Excluded.Contains(p)||p is "" or "." or "..");
    }
    internal static bool Managed(string path)
    {
        if(path.Contains('\\')||path.Contains(':')||!DirectoryAllowed(path)||!path.Contains('/'))return false;
        var name=Path.GetFileName(path);
        if(name.Equals("settings.json",StringComparison.OrdinalIgnoreCase)||name.StartsWith("secrets.",StringComparison.OrdinalIgnoreCase)||name.StartsWith("credentials.",StringComparison.OrdinalIgnoreCase)||name.StartsWith(".env",StringComparison.OrdinalIgnoreCase))return false;
        return Extensions.Contains(Path.GetExtension(path));
    }
    internal static bool IsImage(string path)=>new[]{".png",".jpg",".jpeg",".webp",".ico"}.Contains(Path.GetExtension(path).ToLowerInvariant());
    internal static bool IsText(string path)=>!IsImage(path)&&!new[]{".woff",".woff2",".ttf",".otf"}.Contains(Path.GetExtension(path).ToLowerInvariant());
}
