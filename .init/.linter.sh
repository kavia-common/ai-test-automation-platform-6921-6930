#!/bin/bash
cd /home/kavia/workspace/code-generation/ai-test-automation-platform-6921-6930/frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

