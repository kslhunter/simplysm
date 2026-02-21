#!/usr/bin/env python3
import json, sys, os, subprocess

data = json.load(sys.stdin)

dir_name = os.path.basename(data.get("cwd", ""))

ps_cmd = (
    "Add-Type -AssemblyName System.Windows.Forms; "
    "$notify = New-Object System.Windows.Forms.NotifyIcon; "
    "$notify.Icon = [System.Drawing.SystemIcons]::Information; "
    "$notify.Visible = $true; "
    f"$notify.ShowBalloonTip(3000, 'Claude Code', '[{dir_name}] 작업 완료', "
    "[System.Windows.Forms.ToolTipIcon]::Info); "
    "Start-Sleep -Milliseconds 3500"
)
subprocess.run(["powershell.exe", "-Command", ps_cmd])
