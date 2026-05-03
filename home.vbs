Dim choice
Dim shell
Set shell = CreateObject("WScript.Shell")

Dim BOT_DIR
BOT_DIR = "D:\HAKIM\SAHAM\2026\MARET\BOT TTS"

Dim LOG_FILE
LOG_FILE = BOT_DIR & "\backup\bot.log"

Dim BAT_FILE
BAT_FILE = BOT_DIR & "\start-bot.bat"

Function IsBotRunning()
    Dim wmi, procs, proc, count
    Set wmi = GetObject("winmgmts:\\.\root\cimv2")
    Set procs = wmi.ExecQuery("SELECT * FROM Win32_Process WHERE Name='node.exe'")
    count = 0
    For Each proc In procs
        count = count + 1
    Next
    IsBotRunning = (count > 0)
End Function

Do
    Dim statusLabel
    If IsBotRunning() Then
        statusLabel = "🟢 ONLINE"
    Else
        statusLabel = "🔴 OFFLINE"
    End If

    choice = InputBox("=============================" & vbCrLf & _
                      "   WA TTS BOT - PANEL" & vbCrLf & _
                      "=============================" & vbCrLf & vbCrLf & _
                      "Status: " & statusLabel & vbCrLf & vbCrLf & _
                      "1. Refresh Status" & vbCrLf & _
                      "2. Start Bot" & vbCrLf & _
                      "3. Stop Bot" & vbCrLf & _
                      "4. Restart Bot" & vbCrLf & _
                      "5. Relog WA (Reset Sesi)" & vbCrLf & _
                      "6. Lihat Log" & vbCrLf & _
                      "7. Exit" & vbCrLf & vbCrLf & _
                      "Masukkan angka pilihan:", "WA TTS BOT Panel")

    If choice = "" Or choice = "7" Then
        Exit Do
    End If

    Dim cmd
    cmd = ""

    Select Case choice
        Case "1"
            ' Refresh — loop ulang saja

        Case "2"
            If IsBotRunning() Then
                MsgBox "Bot sudah ONLINE!", vbInformation, "Info"
            Else
                shell.Run "cmd /c start """ & """ """ & BAT_FILE & """", 1, False
            End If

        Case "3"
            If IsBotRunning() Then
                shell.Run "cmd /c taskkill /f /im node.exe", 0, True
                MsgBox "✅ Bot dihentikan.", vbInformation, "Stop Bot"
            Else
                MsgBox "Bot sudah OFFLINE.", vbInformation, "Info"
            End If

        Case "4"
            shell.Run "cmd /c taskkill /f /im node.exe", 0, True
            WScript.Sleep 2000
            shell.Run "cmd /c start """ & """ """ & BAT_FILE & """", 1, False

        Case "5"
            Dim confirm
            confirm = MsgBox("⚠️ Relog WA akan menghapus sesi dan kamu harus scan QR ulang." & vbCrLf & vbCrLf & "Lanjutkan?", vbYesNo + vbExclamation, "Konfirmasi Relog")
            If confirm = vbYes Then
                shell.Run "cmd /c taskkill /f /im node.exe", 0, True
                WScript.Sleep 1000
                shell.Run "cmd /c rmdir /s /q """ & BOT_DIR & "\auth_info""", 0, True
                WScript.Sleep 1000
                shell.Run "cmd /c start """ & """ """ & BAT_FILE & """", 1, False
                MsgBox "✅ Sesi direset. Scan QR di window CMD yang terbuka.", vbInformation, "Relog"
            End If

        Case "6"
            Dim fso
            Set fso = CreateObject("Scripting.FileSystemObject")
            If fso.FileExists(LOG_FILE) Then
                shell.Run "notepad """ & LOG_FILE & """", 1, False
            Else
                MsgBox "Log belum ada. Jalankan bot dulu.", vbExclamation, "Log"
            End If
            Set fso = Nothing

        Case Else
            MsgBox "Pilihan tidak valid! Masukkan angka 1-7.", vbExclamation, "Error"
    End Select
Loop

Set shell = Nothing
