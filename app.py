from flask import Flask, request, jsonify
import unified_planning
import executor
import re

app = Flask(__name__)

def parse_user_intent_fallback(user_text):
    steps=[]
    text_lower = user_text.lower()

    #pattern: create directory
    if "create" in text_lower and "directory" in text_lower:
        match = re.search(r'director(?:y|ies)?\s+(?:called\s+)?(\w+)',text_lower)


@app.route("/", methods={"GET"})
def index():
    return jsonify({
        "status": "running",
        "service": "LLM Powered Autonomous Agent",
        "endpoints": {
            "POST /command": "Generate execution plan (requires confirmation)",
            "POST /confirm": "confirm and execute a pending plan",
            "GET /health": "Check ollama connection and model availability",
            "GET /tools": "List available tools"
        }
    })

