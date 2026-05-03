Dim objShell, objFSO, scriptDir, logDir, logFile, pidFile

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
logDir = scriptDir & "\logs"
logFile = logDir & "\bot.log"
pidFile = scriptDir & "\tmp\bot.pid"

' Buat folder kalau belum ada
If Not objFSO.FolderExists(logDir) Then objFSO.CreateFolder(logDir)
If Not objFSO.FolderExists(scriptDir & "\tmp") Then objFSO.CreateFolder(scriptDir & "\tmp")

' Hapus log lama kalau > 5MB
If objFSO.FileExists(logFile) Then
    If objFSO.GetFile(logFile).Size > 5242880 Then objFSO.DeleteFile(logFile)
End If

' Jalankan bot tersembunyi, log ke file
Dim cmd
cmd = "cmd /c node """ & scriptDir & "\index.js"" >> """ & logFile & """ 2>&1"
objShell.Run cmd, 0, False

' Simpan info bahwa bot sudah dijalankan
Dim ts
ts = Now()
If objFSO.FileExists(pidFile) Then objFSO.DeleteFile(pidFile)
Set fOut = objFSO.CreateTextFile(pidFile, True)
fOut.WriteLine "started=" & ts
fOut.Close

WScript.Quit
