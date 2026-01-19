#!/usr/bin/env python3
"""
Generate daily celebrity files with hashed filenames.
Each file contains 10 celebrities for that day.
Filename is SHA-256 hash of (date + secret salt) to prevent guessing.
"""

import json
import hashlib
from datetime import datetime, timedelta
from pathlib import Path

# Secret salt - change this to your own random string
SALT = "DailyDeparted2024SecretSalt!@#$"

# How many days to generate
DAYS_TO_GENERATE = 365

# Start date (should match your launch date)
START_DATE = datetime(2024, 1, 1)

def mulberry32(seed):
    """Same seeded random as JS version"""
    def random():
        nonlocal seed
        seed = (seed + 0x6D2B79F5) & 0xFFFFFFFF
        t = seed
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 0xFFFFFFFF
    return random

def shuffle_with_seed(items, seed):
    """Fisher-Yates shuffle with seeded random"""
    items = items.copy()
    rng = mulberry32(seed)
    for i in range(len(items) - 1, 0, -1):
        j = int(rng() * (i + 1))
        items[i], items[j] = items[j], items[i]
    return items

def get_day_seed(date):
    """Generate seed from date (same as JS)"""
    return int(date.strftime("%Y%m%d"))

def get_day_number(date):
    """Day number since start"""
    return (date - START_DATE).days + 1

def get_filename_hash(date):
    """Generate hashed filename for a date"""
    date_str = date.strftime("%Y-%m-%d")
    to_hash = f"{SALT}:{date_str}"
    hash_hex = hashlib.sha256(to_hash.encode()).hexdigest()
    return hash_hex[:16]  # First 16 chars

def main():
    # Load celebrities
    data_dir = Path(__file__).parent.parent / "data"
    with open(data_dir / "celebrities.json") as f:
        celebrities = json.load(f)

    print(f"Loaded {len(celebrities)} celebrities")

    # Create days directory
    days_dir = data_dir / "days"
    days_dir.mkdir(exist_ok=True)

    # Generate manifest (maps day number to hash)
    manifest = {}

    # Generate files for each day
    today = datetime.now()
    for i in range(DAYS_TO_GENERATE):
        date = today + timedelta(days=i)
        day_num = get_day_number(date)
        seed = get_day_seed(date)
        filename_hash = get_filename_hash(date)

        # Pick 10 celebrities using seeded shuffle
        shuffled = shuffle_with_seed(celebrities, seed)
        daily_celebs = shuffled[:10]

        # Write file
        filepath = days_dir / f"{filename_hash}.json"
        with open(filepath, 'w') as f:
            json.dump(daily_celebs, f)

        # Add to manifest
        manifest[str(day_num)] = filename_hash

        if i < 5 or i == DAYS_TO_GENERATE - 1:
            print(f"Day {day_num} ({date.strftime('%Y-%m-%d')}): {filename_hash}.json")
        elif i == 5:
            print("...")

    # Write manifest (needed for the game to find today's file)
    # This is the only file that reveals the mapping
    with open(days_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"\nGenerated {DAYS_TO_GENERATE} daily files in {days_dir}")
    print(f"Manifest written to {days_dir}/manifest.json")

    # Also create a hash lookup file for the JS to use
    # Uses same algorithm so JS can compute hash from date
    print(f"\nSalt for JS (keep secret, embed in minified code):")
    print(f"  {SALT}")

if __name__ == "__main__":
    main()
