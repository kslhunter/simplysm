@echo off

for /F "tokens=*" %%I in ('dir /ad /on /b /s ^| findstr /R /C:"node_modules$" /C:"dist[^\\]*$"') do (
    echo %%I
    rd /s /q "%%I"
)

if exist "yarn.lock" del /s /q "yarn.lock"

yarn install
