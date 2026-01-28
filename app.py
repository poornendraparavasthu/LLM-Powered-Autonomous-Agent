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
        