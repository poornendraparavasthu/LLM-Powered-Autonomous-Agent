import ollama

messages = []
while True:
    user_input = input("you: ")
    if user_input.lower() == "quit":
        break
    messages.append({'role':'user','content':user_input})
    response = ollama.chat(
        model='phi3',
        messages=messages,
        stream=True
    )
    response_content = ""
    for chunk in response:
        content = chunk["message"]["content"]
        print(content, end="", flush=True)
        response_content += content
    print()
    messages.append({'role':'assistant','content':response_content})