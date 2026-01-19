#!/usr/bin/env python3
"""
Validate the celebrities.json data file.
Checks for required fields, data quality, and balance.
"""

import json
from pathlib import Path
from typing import List, Dict, Any
import sys


def load_celebrities(path: Path) -> List[Dict[str, Any]]:
    """Load celebrities from JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_celebrity(celebrity: Dict[str, Any], index: int) -> List[str]:
    """Validate a single celebrity record. Returns list of errors."""
    errors = []

    # Required fields
    required = ["id", "name", "imageUrl", "birthYear", "profession"]
    for field in required:
        if field not in celebrity:
            errors.append(f"Celebrity {index}: Missing required field '{field}'")
        elif celebrity[field] is None:
            errors.append(f"Celebrity {index}: Field '{field}' is null")

    # Validate birth year
    if "birthYear" in celebrity and celebrity["birthYear"]:
        birth = celebrity["birthYear"]
        if not isinstance(birth, int):
            errors.append(f"Celebrity {index} ({celebrity.get('name', 'unknown')}): birthYear is not an integer")
        elif birth < -500 or birth > 2010:
            errors.append(f"Celebrity {index} ({celebrity.get('name', 'unknown')}): birthYear {birth} is out of range")

    # Validate death year if present
    if "deathYear" in celebrity and celebrity["deathYear"]:
        death = celebrity["deathYear"]
        if not isinstance(death, int):
            errors.append(f"Celebrity {index} ({celebrity.get('name', 'unknown')}): deathYear is not an integer")
        elif "birthYear" in celebrity and celebrity["birthYear"]:
            if death < celebrity["birthYear"]:
                errors.append(f"Celebrity {index} ({celebrity.get('name', 'unknown')}): deathYear {death} is before birthYear {celebrity['birthYear']}")
            elif death - celebrity["birthYear"] > 130:
                errors.append(f"Celebrity {index} ({celebrity.get('name', 'unknown')}): Age at death ({death - celebrity['birthYear']}) is unrealistic")

    # Validate image URL
    if "imageUrl" in celebrity and celebrity["imageUrl"]:
        url = celebrity["imageUrl"]
        if not url.startswith("http"):
            errors.append(f"Celebrity {index} ({celebrity.get('name', 'unknown')}): Invalid imageUrl")

    # Validate name
    if "name" in celebrity and celebrity["name"]:
        name = celebrity["name"]
        if name.startswith("Q") and name[1:].replace("-", "").isdigit():
            errors.append(f"Celebrity {index}: Name looks like Wikidata ID: {name}")

    return errors


def check_balance(celebrities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Check the dead/alive balance."""
    alive = [c for c in celebrities if "deathYear" not in c or c.get("deathYear") is None]
    dead = [c for c in celebrities if "deathYear" in c and c.get("deathYear") is not None]

    total = len(celebrities)
    alive_pct = len(alive) / total * 100 if total > 0 else 0
    dead_pct = len(dead) / total * 100 if total > 0 else 0

    return {
        "total": total,
        "alive": len(alive),
        "dead": len(dead),
        "alive_pct": alive_pct,
        "dead_pct": dead_pct,
        "is_balanced": 40 <= alive_pct <= 60  # Within 10% of 50/50
    }


def check_duplicates(celebrities: List[Dict[str, Any]]) -> List[str]:
    """Check for duplicate IDs or names."""
    errors = []
    seen_ids = {}
    seen_names = {}

    for i, c in enumerate(celebrities):
        cid = c.get("id")
        name = c.get("name")

        if cid in seen_ids:
            errors.append(f"Duplicate ID '{cid}' at indices {seen_ids[cid]} and {i}")
        else:
            seen_ids[cid] = i

        if name in seen_names:
            # Names can legitimately be duplicates (different people with same name)
            # Just warn, don't error
            pass
        else:
            seen_names[name] = i

    return errors


def main():
    """Main validation function."""
    data_path = Path(__file__).parent.parent / "data" / "celebrities.json"

    if not data_path.exists():
        print(f"Error: {data_path} does not exist")
        print("Run scraper.py first to generate the data file.")
        sys.exit(1)

    print(f"Validating {data_path}...\n")

    celebrities = load_celebrities(data_path)

    # Validate each celebrity
    all_errors = []
    for i, celebrity in enumerate(celebrities):
        errors = validate_celebrity(celebrity, i)
        all_errors.extend(errors)

    # Check for duplicates
    dup_errors = check_duplicates(celebrities)
    all_errors.extend(dup_errors)

    # Check balance
    balance = check_balance(celebrities)

    # Print results
    print("=" * 50)
    print("VALIDATION RESULTS")
    print("=" * 50)

    print(f"\nDataset size: {balance['total']} celebrities")
    print(f"  Alive: {balance['alive']} ({balance['alive_pct']:.1f}%)")
    print(f"  Dead: {balance['dead']} ({balance['dead_pct']:.1f}%)")
    print(f"  Balanced: {'Yes' if balance['is_balanced'] else 'No (should be ~50/50)'}")

    if all_errors:
        print(f"\nFound {len(all_errors)} errors:")
        for error in all_errors[:20]:  # Show first 20
            print(f"  - {error}")
        if len(all_errors) > 20:
            print(f"  ... and {len(all_errors) - 20} more errors")
        sys.exit(1)
    else:
        print("\n✅ No errors found!")

    # Sample some celebrities
    print("\nSample celebrities:")
    import random
    samples = random.sample(celebrities, min(5, len(celebrities)))
    for c in samples:
        status = "Dead" if c.get("deathYear") else "Alive"
        print(f"  - {c['name']} ({c['birthYear']}-{c.get('deathYear', 'present')}): {c['profession']} [{status}]")

    sys.exit(0)


if __name__ == "__main__":
    main()
