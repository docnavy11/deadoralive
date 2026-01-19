#!/usr/bin/env python3
"""
Wikidata SPARQL scraper for celebrity data.
Fetches notable people with images, birth/death dates, and professions.
Uses small batches by profession to avoid timeouts.
"""

import json
import requests
import time
from pathlib import Path

WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql"

# Professions to query (Wikidata IDs)
PROFESSIONS = [
    # Acting & Entertainment
    ("Q33999", "actor"),
    ("Q10800557", "film actor"),
    ("Q2405480", "voice actor"),
    ("Q245068", "comedian"),
    ("Q15981151", "television presenter"),
    ("Q947873", "television presenter"),
    ("Q17125263", "youtuber"),
    ("Q5716684", "stunt performer"),
    ("Q2259451", "magician"),
    ("Q15214752", "talent show contestant"),

    # Music
    ("Q177220", "singer"),
    ("Q639669", "musician"),
    ("Q183945", "record producer"),
    ("Q486748", "pianist"),
    ("Q855091", "guitarist"),
    ("Q384391", "drummer"),
    ("Q36834", "composer"),
    ("Q753110", "rapper"),
    ("Q130857", "DJ"),
    ("Q158852", "conductor"),
    ("Q2865819", "opera singer"),
    ("Q1259917", "violinist"),
    ("Q12800682", "saxophonist"),
    ("Q806349", "bassist"),
    ("Q386854", "trumpeter"),

    # Sports - Ball sports
    ("Q937857", "association football player"),
    ("Q3665646", "basketball player"),
    ("Q10871364", "tennis player"),
    ("Q12299841", "cricketer"),
    ("Q10833314", "baseball player"),
    ("Q15117302", "volleyball player"),
    ("Q18515558", "rugby player"),
    ("Q19204627", "American football player"),
    ("Q4009406", "ice hockey player"),
    ("Q13141064", "golfer"),
    ("Q6665249", "badminton player"),
    ("Q13381863", "table tennis player"),
    ("Q11774891", "handball player"),

    # Sports - Combat
    ("Q11338576", "boxer"),
    ("Q13474373", "mixed martial artist"),
    ("Q10873124", "chess player"),
    ("Q14089670", "judoka"),
    ("Q10843263", "fencer"),
    ("Q13381753", "wrestler"),

    # Sports - Racing & Speed
    ("Q378622", "racing driver"),
    ("Q2309784", "cyclist"),
    ("Q10843402", "swimmer"),
    ("Q15924516", "figure skater"),
    ("Q4270517", "speed skater"),
    ("Q13382519", "alpine skier"),
    ("Q13382981", "gymnast"),
    ("Q10873338", "diver"),

    # Sports - Athletics
    ("Q2066131", "athlete"),
    ("Q11513119", "sprinter"),
    ("Q11513337", "marathon runner"),
    ("Q14128148", "high jumper"),
    ("Q14629765", "long jumper"),
    ("Q14915786", "pole vaulter"),
    ("Q14915787", "shot putter"),

    # Film & TV
    ("Q2526255", "film director"),
    ("Q3282637", "film producer"),
    ("Q28389", "screenwriter"),
    ("Q3455803", "director"),
    ("Q222344", "cinematographer"),
    ("Q2722764", "television director"),

    # Writing & Literature
    ("Q36180", "writer"),
    ("Q482980", "author"),
    ("Q1930187", "journalist"),
    ("Q49757", "poet"),
    ("Q214917", "playwright"),
    ("Q4853732", "children's writer"),
    ("Q6625963", "novelist"),
    ("Q4164507", "comics artist"),

    # Visual Arts
    ("Q33231", "photographer"),
    ("Q1028181", "painter"),
    ("Q1281618", "sculptor"),
    ("Q42973", "architect"),
    ("Q627325", "graphic designer"),
    ("Q644687", "illustrator"),
    ("Q3391743", "interior designer"),
    ("Q1114448", "cartoonist"),

    # Business & Politics
    ("Q82955", "politician"),
    ("Q11513337", "billionaire"),
    ("Q131524", "entrepreneur"),
    ("Q484876", "chief executive officer"),
    ("Q806798", "banker"),
    ("Q43845", "businessperson"),
    ("Q16533", "judge"),
    ("Q40348", "lawyer"),

    # Science & Academia
    ("Q901", "scientist"),
    ("Q11063", "astronaut"),
    ("Q169470", "physicist"),
    ("Q593644", "chemist"),
    ("Q864503", "biologist"),
    ("Q170790", "mathematician"),
    ("Q15976092", "neuroscientist"),
    ("Q81096", "engineer"),
    ("Q1622272", "university teacher"),
    ("Q205375", "inventor"),

    # Medicine
    ("Q39631", "physician"),
    ("Q774306", "surgeon"),
    ("Q2374149", "psychiatrist"),
    ("Q2640827", "psychologist"),

    # Royalty & Military
    ("Q116", "monarch"),
    ("Q36180", "prince"),
    ("Q2478141", "princess"),
    ("Q47064", "military personnel"),
    ("Q189290", "military officer"),
    ("Q10669499", "naval officer"),

    # Religion
    ("Q432386", "religious leader"),
    ("Q250867", "Catholic priest"),
    ("Q42603", "priest"),

    # Fashion & Lifestyle
    ("Q4610556", "model"),
    ("Q3501317", "fashion designer"),
    ("Q3387717", "chef"),
    ("Q2095549", "bartender"),
    ("Q13582652", "sommelier"),
    ("Q15855449", "podcaster"),

    # Exploration & Adventure
    ("Q11900058", "explorer"),
    ("Q2125610", "mountaineer"),
    ("Q955464", "pilot"),
    ("Q2516866", "sailor"),

    # Social & Activism
    ("Q15253558", "activist"),
    ("Q327055", "socialite"),
    ("Q2722764", "philanthropist"),
]

def make_query(profession_id: str, is_dead: bool, limit: int = 200) -> str:
    """Generate SPARQL query for a specific profession."""
    if is_dead:
        return f"""
SELECT DISTINCT ?person ?personLabel ?image ?birthYear ?deathYear
WHERE {{
  ?person wdt:P31 wd:Q5;
          wdt:P106 wd:{profession_id};
          wdt:P18 ?image;
          wdt:P569 ?birthDate;
          wdt:P570 ?deathDate.

  BIND(YEAR(?birthDate) AS ?birthYear)
  BIND(YEAR(?deathDate) AS ?deathYear)

  FILTER(?birthYear >= 1900)
  FILTER(?deathYear >= 1980)

  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
LIMIT {limit}
"""
    else:
        return f"""
SELECT DISTINCT ?person ?personLabel ?image ?birthYear
WHERE {{
  ?person wdt:P31 wd:Q5;
          wdt:P106 wd:{profession_id};
          wdt:P18 ?image;
          wdt:P569 ?birthDate.

  FILTER NOT EXISTS {{ ?person wdt:P570 ?deathDate. }}

  BIND(YEAR(?birthDate) AS ?birthYear)

  FILTER(?birthYear >= 1940)
  FILTER(?birthYear <= 1995)

  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
LIMIT {limit}
"""


def fetch_query(query: str, description: str) -> list:
    """Execute a single SPARQL query."""
    headers = {
        "Accept": "application/sparql-results+json",
        "User-Agent": "DeadOrAliveGame/1.0 (educational game project)"
    }

    try:
        response = requests.get(
            WIKIDATA_ENDPOINT,
            params={"query": query},
            headers=headers,
            timeout=60
        )
        response.raise_for_status()

        data = response.json()
        results = data.get("results", {}).get("bindings", [])
        print(f"  ✓ {description}: {len(results)} results")
        return results

    except requests.exceptions.Timeout:
        print(f"  ✗ {description}: timeout")
        return []
    except requests.exceptions.RequestException as e:
        print(f"  ✗ {description}: {e}")
        return []


def fetch_all_celebrities() -> tuple:
    """Fetch celebrities by profession in small batches."""
    dead_results = []
    alive_results = []

    print("Fetching dead celebrities by profession...")
    for prof_id, prof_name in PROFESSIONS:
        query = make_query(prof_id, is_dead=True, limit=150)
        results = fetch_query(query, f"dead {prof_name}s")
        dead_results.extend(results)
        time.sleep(1.5)  # Be nice to Wikidata

    print(f"\nTotal dead results: {len(dead_results)}")

    print("\nFetching living celebrities by profession...")
    for prof_id, prof_name in PROFESSIONS:
        query = make_query(prof_id, is_dead=False, limit=150)
        results = fetch_query(query, f"living {prof_name}s")
        alive_results.extend(results)
        time.sleep(1.5)

    print(f"\nTotal alive results: {len(alive_results)}")

    return dead_results, alive_results


def process_results(dead_results: list, alive_results: list) -> list:
    """Process SPARQL results into our celebrity format."""
    celebrities = {}

    all_results = [(row, True) for row in dead_results] + [(row, False) for row in alive_results]

    for row, is_dead in all_results:
        person_id = row.get("person", {}).get("value", "").split("/")[-1]

        if person_id in celebrities:
            continue

        name = row.get("personLabel", {}).get("value", "")
        image_url = row.get("image", {}).get("value", "")
        birth_year = row.get("birthYear", {}).get("value")
        death_year = row.get("deathYear", {}).get("value") if is_dead else None

        # Skip if name looks like a Wikidata ID
        if name.startswith("Q") and name[1:].isdigit():
            continue

        if not image_url or not birth_year:
            continue

        # Add thumbnail parameter
        if "commons.wikimedia.org" in image_url:
            image_url = f"{image_url}?width=300"

        celebrity = {
            "id": person_id,
            "name": name,
            "imageUrl": image_url,
            "birthYear": int(float(birth_year)),
            "profession": "notable person",
            "professionDisplay": "Notable person"
        }

        if death_year:
            celebrity["deathYear"] = int(float(death_year))

        celebrities[person_id] = celebrity

    return list(celebrities.values())


def add_professions(celebrities: list) -> list:
    """Add profession info by querying Wikidata for each person."""
    print("\nFetching profession details...")

    # Batch query for professions - query in chunks to avoid timeout
    ids = [c["id"] for c in celebrities]

    query = f"""
SELECT ?person ?personLabel ?occupationLabel
WHERE {{
  VALUES ?person {{ {' '.join(f'wd:{id}' for id in ids)} }}
  ?person wdt:P106 ?occupation.
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
"""

    try:
        results = fetch_query(query, "professions")

        # Build profession map
        prof_map = {}
        for row in results:
            pid = row.get("person", {}).get("value", "").split("/")[-1]
            occ = row.get("occupationLabel", {}).get("value", "")
            if pid and occ and not occ.startswith("Q"):
                if pid not in prof_map:
                    prof_map[pid] = occ

        # Apply to celebrities
        for c in celebrities:
            if c["id"] in prof_map:
                occ = prof_map[c["id"]]
                c["profession"] = occ.lower()
                c["professionDisplay"] = occ.title()

    except Exception as e:
        print(f"  Warning: Could not fetch professions: {e}")

    return celebrities


def balance_and_select(celebrities: list, target_total: int = 2000) -> list:
    """Balance dead/alive and select best candidates."""
    alive = [c for c in celebrities if "deathYear" not in c]
    dead = [c for c in celebrities if "deathYear" in c]

    print(f"\nBefore balancing: {len(alive)} alive, {len(dead)} dead")

    # Target roughly equal split
    target_each = target_total // 2

    # Sort by "interestingness" - prefer diverse birth years
    import random
    random.seed(42)  # Reproducible
    random.shuffle(alive)
    random.shuffle(dead)

    selected_alive = alive[:target_each]
    selected_dead = dead[:target_each]

    balanced = selected_alive + selected_dead
    random.shuffle(balanced)

    print(f"After balancing: {len(selected_alive)} alive, {len(selected_dead)} dead")
    print(f"Total selected: {len(balanced)}")

    return balanced


def save_celebrities(celebrities: list, output_path: Path):
    """Save celebrities to JSON file."""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(celebrities, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Saved {len(celebrities)} celebrities to {output_path}")


def main():
    """Main scraper function."""
    output_dir = Path(__file__).parent.parent / "data"
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / "celebrities.json"

    # Backup existing file
    if output_path.exists():
        backup_path = output_dir / "celebrities_backup.json"
        import shutil
        shutil.copy(output_path, backup_path)
        print(f"Backed up existing data to {backup_path}")

    # Fetch data in batches
    dead_results, alive_results = fetch_all_celebrities()

    if not dead_results and not alive_results:
        print("\n✗ No results fetched. Keeping existing data.")
        return

    # Process results
    celebrities = process_results(dead_results, alive_results)
    print(f"\nProcessed {len(celebrities)} unique celebrities")

    if len(celebrities) < 50:
        print("\n✗ Too few results. Keeping existing data.")
        return

    # Balance and select first
    balanced = balance_and_select(celebrities, target_total=2000)

    # Add profession details to the selected celebrities
    balanced = add_professions(balanced)

    # Save to file
    save_celebrities(balanced, output_path)

    # Print stats
    alive_count = len([c for c in balanced if "deathYear" not in c])
    dead_count = len([c for c in balanced if "deathYear" in c])
    print(f"\nFinal stats:")
    print(f"  Total: {len(balanced)}")
    print(f"  Alive: {alive_count} ({alive_count/len(balanced)*100:.1f}%)")
    print(f"  Dead: {dead_count} ({dead_count/len(balanced)*100:.1f}%)")


if __name__ == "__main__":
    main()
