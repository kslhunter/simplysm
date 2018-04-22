@echo off
ts-node --project scripts/tsconfig.json  --require tsconfig-paths/register scripts/%1 %2
