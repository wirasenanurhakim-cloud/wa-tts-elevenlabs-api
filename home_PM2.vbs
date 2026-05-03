Dim choice
Dim shell
Set shell = CreateObject("WScript.Shell")

Do
    choice = InputBox("=============================" & vbCrLf & _
                      "   WA TTS BOT - PANEL" & vbCrLf & _
                      "=============================" & vbCrLf & vbCrLf & _
                      "1. Status Bot" & vbCrLf & _
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
            cmd = "cmd /k ""cd /d D:\HAKIM\SAHAM\2026\MARET\BOT TTS && pm2 status"""
        Case "2"
            cmd = "cmd /k ""cd /d D:\HAKIM\SAHAM\2026\MARET\BOT TTS && pm2 start index.js --name wa-tts-bot"""
        Case "3"
            cmd = "cmd /k ""cd /d D:\HAKIM\SAHAM\2026\MARET\BOT TTS && pm2 stop wa-tts-bot"""
        Case "4"
            cmd = "cmd /k ""cd /d D:\HAKIM\SAHAM\2026\MARET\BOT TTS && pm2 restart wa-tts-bot"""
        Case "5"
            Dim confirm
            confirm = MsgBox("⚠️ Relog WA akan menghapus sesi dan kamu harus scan QR ulang." & vbCrLf & vbCrLf & "Lanjutkan?", vbYesNo + vbExclamation, "Konfirmasi Relog")
            If confirm = vbYes Then
                cmd = "cmd /k ""cd /d D:\HAKIM\SAHAM\2026\MARET\BOT TTS && pm2 delete all && rmdir /s /q auth_info && pm2 start index.js --name wa-tts-bot && pm2 logs wa-tts-bot"""
            End If
        Case "6"
            cmd = "cmd /k ""cd /d D:\HAKIM\SAHAM\2026\MARET\BOT TTS && pm2 logs wa-tts-bot --lines 50"""
        Case Else
            MsgBox "Pilihan tidak valid! Masukkan angka 1-7.", vbExclamation, "Error"
    End Select

    If cmd <> "" Then
        shell.Run cmd, 1, False
    End If
Loop

Set shell = Nothing
