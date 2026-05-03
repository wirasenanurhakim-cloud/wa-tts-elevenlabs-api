Dim objShell, objFSO, scriptDir

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Ganti path ini dengan lokasi folder bot kamu
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Jalankan start-bot.vbs dari folder yang sama
Dim startScript
startScript = scriptDir & "\start-bot.vbs"

If objFSO.FileExists(startScript) Then
    objShell.Run "wscript //nologo """ & startScript & """", 0, False
End If

WScript.Quit
