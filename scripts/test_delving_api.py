import requests
import json

DELVING_URL = "https://delvingbitcoin.org"

def test_fetch_topic(topic_id, slug):
    url = f"{DELVING_URL}/t/{slug}/{topic_id}.json"
    response = requests.get(url)
    data = response.json()
    
    print("Top level keys:", data.keys())
    posts = data.get("post_stream", {}).get("posts", [])
    if posts:
        print("First post keys:", posts[0].keys())
        print("First post user info:", {k: posts[0].get(k) for k in ["username", "display_name", "name"]})

if __name__ == "__main__":
    test_fetch_topic(2170, "major-bip-360-update")
