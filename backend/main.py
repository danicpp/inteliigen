from fastapi import FastAPI
from pydantic import BaseModel
import spacy
from fastapi.middleware.cors import CORSMiddleware
import hashlib

app = FastAPI()

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for prototype
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Load the spaCy NER model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Warning: spaCy model 'en_core_web_sm' not found. Please run 'python -m spacy download en_core_web_sm'")
    nlp = None

class TextInput(BaseModel):
    text: str

def generate_id(name: str) -> str:
    """Generate a consistent ID for nodes based on their text."""
    return hashlib.md5(name.lower().encode()).hexdigest()

@app.post("/analyze")
async def analyze_text(input_data: TextInput):
    if not nlp:
        return {"error": "NER model not loaded. Please download it."}

    doc = nlp(input_data.text)
    
    nodes = []
    links = []
    
    # Keep track of unique entities to avoid duplicate nodes
    entities_seen = set()
    
    # 1. Create a "Document" node so everything points back to it
    source_id = "doc_" + generate_id(input_data.text[:50]) # pseudo-doc ID
    nodes.append({
        "id": source_id,
        "label": "Document Source",
        "group": "Document",
        "color": "#fff"
    })
    
    # 2. Extract entities and link them to the Document
    for ent in doc.ents:
        # Filter for relevant types (Person, Org, Location, Date, Event, Facility, Product, Money, Nationality)
        if ent.label_ in ["PERSON", "ORG", "LOC", "GPE", "DATE", "TIME", "EVENT", "FAC", "PRODUCT", "MONEY", "NORP"]:
            entity_id = generate_id(ent.text)
            
            # Add node only if we haven't seen it yet
            if entity_id not in entities_seen:
                nodes.append({
                    "id": entity_id,
                    "label": ent.text,
                    "group": ent.label_
                })
                entities_seen.add(entity_id)
            
            # Link the document to the entity
            # Check if link already exists (we might find the same word twice in doc)
            link_exists = any(l for l in links if l["source"] == source_id and l["target"] == entity_id)
            if not link_exists:
                links.append({
                    "source": source_id,
                    "target": entity_id,
                    "label": "MENTIONS"
                })

    return {
        "nodes": nodes,
        "links": links
    }
