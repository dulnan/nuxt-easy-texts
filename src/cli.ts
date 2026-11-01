#!/usr/bin/env node
import { runCli } from './build/merge/cli'

process.exitCode = await runCli(process.argv.slice(2), process.cwd())
