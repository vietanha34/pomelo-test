#!/usr/bin/env bash
pm2 deploy ecosystem.json dev
pm2 deploy ecosystem.json core
pm2 deploy ecosystem.json production