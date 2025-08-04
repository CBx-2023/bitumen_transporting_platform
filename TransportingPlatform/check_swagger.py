import requests

try:
    response = requests.get('http://127.0.0.1:8000/swagger/')
    print(f"Status code: {response.status_code}")
    if response.status_code == 200:
        print("Swagger UI is accessible!")
    else:
        print(f"Error: {response.text[:200]}")
except Exception as e:
    print(f"Error: {str(e)}")