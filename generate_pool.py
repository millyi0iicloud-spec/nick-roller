# language: Python, file: generate_pool.py, target: Python 3.11
# Генерация ников по редкостям с проверкой через Minecraft API

import json
import random
import requests
import time

PREFIXES = ["", "x", "og", "real", "pro", "the", "_", "im", "its"]
SUFFIXES = ["", "_", "x", "123", "777", "gg", "tv", "_yt", "99", "01"]
LEET = {"a": "4", "e": "3", "i": "1", "o": "0", "s": "5", "t": "7"}

COMMON_WORDS = ["fire", "wolf", "dark", "moon", "star", "ice", "iron", "sky", "fox", "king"]
RARE_WORDS = ["ghost", "blade", "storm", "raven", "viper", "phantom", "cyber", "neon", "nova", "rune"]
EPIC_WORDS = ["legend", "dragon", "phoenix", "shadow", "titan", "oracle", "revenant", "wraith"]
LEGENDARY_WORDS = ["god", "omega", "apex", "zenith", "infinity", "eternal", "primordial"]


def check_minecraft(nick: str) -> bool:
    """True = свободен."""
    try:
        r = requests.get(f"https://api.mojang.com/users/profiles/minecraft/{nick}", timeout=10)
        return r.status_code == 204
    except Exception:
        return False


def mutate(word: str) -> list:
    """Генерация комбинаций для одного слова."""
    out = set()
    for p in PREFIXES:
        for s in SUFFIXES:
            out.add(f"{p}{word}{s}")
    leet = word
    for k, v in LEET.items():
        leet = leet.replace(k, v)
    out.add(leet)
    out.add(word.capitalize())
    out.add(word.upper())
    return list(out)


def build_pool():
    pool = {"common": [], "rare": [], "epic": [], "legendary": []}
    mapping = [
        ("common", COMMON_WORDS, 40),
        ("rare", RARE_WORDS, 30),
        ("epic", EPIC_WORDS, 20),
        ("legendary", LEGENDARY_WORDS, 10),
    ]

    for rarity, words, limit in mapping:
        print(f"[*] {rarity}: проверяю {len(words)} базовых слов...")
        for w in words:
            for nick in mutate(w):
                if len(pool[rarity]) >= limit:
                    break
                if len(nick) < 3 or len(nick) > 16:
                    continue
                if check_minecraft(nick):
                    pool[rarity].append(nick)
                    print(f"  [+] {rarity}: {nick}")
                time.sleep(0.15)
            if len(pool[rarity]) >= limit:
                break

    with open("nick_pool.json", "w", encoding="utf-8") as f:
        json.dump(pool, f, indent=2, ensure_ascii=False)

    total = sum(len(v) for v in pool.values())
    print(f"[+] Всего ников: {total}")


if __name__ == "__main__":
    build_pool()
