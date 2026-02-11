import ollama
from pydantic import BaseModel
import platform
from typing import List,Literal

def get_os():
    system = platform.system().lower()
    print(system)
system_rule = 'you are a linux command generator'

class CommandResponse(BaseModel):
    command: str
    info: str
    task: str
    risk_level: Literal["Low","Medium","High"]



messages = []
messages.append({'role':'system','content':system_rule})
while True:
    user_input = input("you: ")
    if user_input.lower() == "quit":
        break
    messages.append({'role':'user','content':user_input})
    response = ollama.chat(
        model='phi3',
        messages=messages,
        format=CommandResponse.model_json_schema(),
        stream=True
    )
    response_content = ""
    for chunk in response:
        content = chunk["message"]["content"]
        print(content, end="", flush=True)
        response_content += content
    print()
    messages.append({'role':'assistant','content':response_content})