Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = strDir
WshShell.Run """" & strDir & "\node_modules\electron\dist\electron.exe"" """ & strDir & """", 0, False
