import pandas as pd
import json
import os

def find_unmapped():
    with open('config/identity_mappings.json') as f:
        mapping = json.load(f)
    
    mapped_ids = set()
    for entry in mapping['aliases']:
        mapped_ids.add(entry['canonical_name'].lower())
        for alias in entry.get('aliases', []):
            mapped_ids.add(alias.lower())
        for email in entry.get('emails', []):
            mapped_ids.add(email.lower())
            
    df = pd.read_parquet('data/raw/social_combined.parquet')
    
    # Check canonical_id
    unmapped = df[~df['canonical_id'].str.lower().isin(mapped_ids) & df['canonical_id'].notna()]
    counts = unmapped['canonical_id'].value_counts()
    
    print("Top Unmapped Authors:")
    print(counts.head(50))

if __name__ == "__main__":
    find_unmapped()
