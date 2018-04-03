@echo off
cross-env TS_NODE_PROJECT=scripts ts-node -r tsconfig-paths/register scripts/%1 %2
