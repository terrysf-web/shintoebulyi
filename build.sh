#!/bin/sh
# 사용법: sh build.sh  (처음 한 번 `npm install` 필요)
set -e
cd "$(dirname "$0")"
npx esbuild src/adapter.js --bundle --minify --format=iife --target=es2019 --outfile=sync.bundle.js
