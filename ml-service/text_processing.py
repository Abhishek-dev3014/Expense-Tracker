"""One normalization contract for training and inference; no substring deletion."""
import re
import unicodedata

NOISE = re.compile(
    r"\b(?:transaction\s+at|payment\s+to|spent\s+on|order\s+at|"
    r"upi|pos|imps|neft|rtgs|ref(?:erence)?|txn|transfer|inr|rs)\b",
    re.IGNORECASE,
)
ALIASES = {
    "chai": "tea", "nashta": "breakfast", "khana": "food",
    "kirana": "grocery", "sabzi": "vegetables", "sabji": "vegetables",
    "doodh": "milk", "dudh": "milk", "bijli": "electricity",
    "dawai": "medicine", "dawa": "medicine", "kiraya": "rent",
    "autorickshaw": "rickshaw", "ubertrip": "uber", "uberindia": "uber",
    "swiggyinstamart": "instamart",
}


def clean_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", str(text)).casefold()
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"\b([\w.+-]+)@[\w.-]+\b", r"\1", text)
    text = re.sub(r"[^\w\s]", " ", text)
    text = NOISE.sub(" ", text)
    # Keep merchant names such as 1mg and Zee5, remove amounts and bank references.
    text = re.sub(r"\b(?:\d+|(?=\w{10,}\b)(?=\w*\d)\w+)\b", " ", text)
    return " ".join(ALIASES.get(word, word) for word in text.split())
