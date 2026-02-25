import requests

# لینک جدید (به جای /risk/static، رفتیم سراغ /risk/history/1)
# عدد 1 در انتهای لینک، همون user_id هست
URL = "https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/history/2"

print("--- Fetching History from AWS Cloud ---")
response = requests.get(URL) # دقت کن که اینجا متد GET هست، نه POST

if response.status_code == 200:
    print("Success! Here is the history:")
    print(response.json())
else:
    print(f"Error! Status Code: {response.status_code}")
    print(response.text)