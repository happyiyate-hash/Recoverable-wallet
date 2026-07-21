import secrets

def generate_api_key():
    return f"wv_{secrets.token_urlsafe(32)}"
