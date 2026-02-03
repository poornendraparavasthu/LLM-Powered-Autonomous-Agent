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

@app.route("/health",methods=["GET"])
def health():
    model = request.args.get("model",planner.DEFAULT_MODEL)
    status = planner.test_ollama_connection(model)
    return jsonify(status)

if __name__ == "__main__":
    print("="*60)
    print("flask llm command executor with (with user confirmation)")
    print("="*60)
    print("starting server on http://localhost:5000")
    print("\nEndpoints:")
    print(" GET / - Service info")
    print(" GET /health - Check ollama connection")
    print(" GET /tools - List available tools")
    print("Post /command - Generate plan (requires confirmation)")
    print("Post /confirm - Execute confirmed plan")
    print("="*60)
    app.run(host="0.0.0.0", port=5000, debug=True)