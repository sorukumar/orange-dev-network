import requests
import pandas as pd
import json
import os
from datetime import datetime
import time

# --- Configuration ---
DELVING_URL = "https://delvingbitcoin.org"
OUTPUT_PARQUET = "data/raw/social_delving.parquet"
ALIASES_PATH = "config/identity_mappings.json"
STATE_PATH = "data/state.json"

def load_aliases():
    if not os.path.exists(ALIASES_PATH):
        return {}
    with open(ALIASES_PATH, 'r') as f:
        data = json.load(f)
    lookup = {}
    for entry in data.get("aliases", []):
        canonical = entry["canonical_name"]
        lookup[canonical.lower()] = canonical
        for alias in entry.get("aliases", []):
            lookup[alias.lower()] = canonical
        for email in entry.get("emails", []):
            lookup[email.lower()] = canonical
    return lookup

def load_state():
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH, 'r') as f:
            return json.load(f)
    return {}

def save_state(state):
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, 'w') as f:
        json.dump(state, f, indent=2)

def map_author(name, username, lookup):
    # Try name first, then username
    if name and name.lower() in lookup:
        return lookup[name.lower()]
    if username and username.lower() in lookup:
        return lookup[username.lower()]
    return name or username

def fetch_all_topics_and_posts(max_topic_id):
    print(f"Fetching topics and posts from {DELVING_URL}...")
    all_records = []
    page = 0
    lookup = load_aliases()
    
    while True:
        url = f"{DELVING_URL}/latest.json?page={page}"
        print(f"  Fetching topics page {page}...")
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            topics = data.get("topic_list", {}).get("topics", [])
            if not topics:
                break
                
            users_list = data.get("users", [])
            user_map = {u["id"]: u for u in users_list}
            
            new_in_page = 0
            for t in topics:
                topic_id = t["id"]
                if topic_id <= max_topic_id:
                    continue
                
                # Fetch the full topic with posts
                topic_url = f"{DELVING_URL}/t/{t['slug']}/{topic_id}.json"
                print(f"    Fetching posts for topic {topic_id}...")
                try:
                    topic_response = requests.get(topic_url, timeout=30)
                    topic_response.raise_for_status()
                    topic_data = topic_response.json()
                    
                    topic_users = topic_data.get("users", [])
                    topic_user_map = {u["id"]: u for u in topic_users}
                    
                    posts = topic_data.get("post_stream", {}).get("posts", [])
                    for post in posts:
                        post_id = post["id"]
                        created_at = post["created_at"]
                        user_id = post["user_id"]
                        reply_to_post_number = post.get("reply_to_post_number")
                        cooked = post.get("cooked", "")
                        
                        user_data = topic_user_map.get(user_id, {})
                        author_name = user_data.get("name") or user_data.get("username")
                        author_username = user_data.get("username")
                        
                        canonical_id = map_author(author_name, author_username, lookup)
                        
                        # Extract text snippet from HTML (simple strip)
                        import re
                        body_snippet = re.sub(r'<[^>]+>', '', cooked)[:200].strip()
                        
                        all_records.append({
                            "source": "delving",
                            "message_id": f"post_{post_id}",
                            "date": pd.to_datetime(created_at).tz_localize(None),
                            "author_name": author_name,
                            "author_email": None,
                            "canonical_id": canonical_id,
                            "subject": t["title"] if post["post_number"] == 1 else f"Re: {t['title']}",
                            "body_snippet": body_snippet,
                            "thread_id": f"topic_{topic_id}",
                            "reply_to": f"post_{reply_to_post_number}" if reply_to_post_number else None,
                            "is_reply": reply_to_post_number is not None,
                            "link": f"{DELVING_URL}/t/{t['slug']}/{topic_id}/{post['post_number']}"
                        })
                    
                    new_in_page += 1
                    
                except Exception as e:
                    print(f"Error fetching posts for topic {topic_id}: {e}")
                    continue
                
                # Rate limiting
                time.sleep(0.5)
            
            if new_in_page == 0:
                break
            
            time.sleep(0.5)
            page += 1
            
            if page > 1000:
                break
                
        except Exception as e:
            print(f"Error fetching topics page {page}: {e}")
            break
            
    return all_records

def main():
    state = load_state()
    last_max_id = state.get("delving", {}).get("max_topic_id", 0)
    
    # Load existing
    existing_df = None
    if os.path.exists(OUTPUT_PARQUET):
        existing_df = pd.read_parquet(OUTPUT_PARQUET)
        if not existing_df.empty:
            extracted = existing_df['thread_id'].str.extract(r'topic_(\d+)').astype(int)
            max_id = extracted.max()
        else:
            max_id = 0
    else:
        max_id = last_max_id  # Use state if no file
    
    records = fetch_all_topics_and_posts(max_id)
    if records:
        new_df = pd.DataFrame(records)
        if existing_df is not None and not existing_df.empty:
            df = pd.concat([existing_df, new_df], ignore_index=True)
        else:
            df = new_df
        os.makedirs(os.path.dirname(OUTPUT_PARQUET), exist_ok=True)
        df.to_parquet(OUTPUT_PARQUET, index=False)
        print(f"Saved {len(df)} delving posts to {OUTPUT_PARQUET}")
        # Update state
        extracted = df['thread_id'].str.extract(r'topic_(\d+)').astype(int)
        new_max_topic_id = extracted.max()
        state.setdefault("delving", {})["max_topic_id"] = int(new_max_topic_id)
        save_state(state)
    else:
        print("No new Delving records found.")

if __name__ == "__main__":
    main()
