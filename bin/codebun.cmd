@echo off
rem Codebun launcher for cmd.exe and anything that cannot run sh: hands over to
rem bin/codebun, which is the real script (see there for what it does).
setlocal
for %%I in ("%~dp0..") do set "ROOT=%%~fI"

set "SH="
if exist "C:\Users\Lenovo\msys64\usr\bin\bash.exe" set "SH=C:\Users\Lenovo\msys64\usr\bin\bash.exe"
if not defined SH if exist "%ProgramFiles%\Git\bin\bash.exe" set "SH=%ProgramFiles%\Git\bin\bash.exe"
if not defined SH (
	echo ERROR: no bash found. Install MSYS2 or run bin/codebun from an sh shell.>&2
	exit /b 1
)

"%SH%" -lc "cd '%ROOT:\=/%' && ./bin/codebun %*"
exit /b %ERRORLEVEL%
