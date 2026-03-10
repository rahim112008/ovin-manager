import streamlit as st
import sqlite3
import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
from PIL import Image
import numpy as np
import requests

# ------------------------------------------------------------
# CONSTANTS
# ------------------------------------------------------------
SPECIES = {
    "ovin": {
        "name": "Ovin",
        "icon": "🐑",
        "category": "animal",
        "breeds": ["Ouled Djellal", "Hamra", "Sidahou"],
        "life_stages": [
            {"id": "agneau", "name": "Agneau", "gender": "male"},
            {"id": "agnelle", "name": "Agnelle", "gender": "female"},
            {"id": "belier", "name": "Bélier", "gender": "male"},
            {"id": "brebis", "name": "Brebis", "gender": "female"}
        ],
        "physiological_states": ["vide", "gestante", "allaitante", "lactation", "tarie"],
        "morphometrics": {
            "male": [
                {"name": "longueur_corps", "unit": "cm", "label": "Longueur du corps"},
                {"name": "hauteur_garrot", "unit": "cm", "label": "Hauteur au garrot"},
                {"name": "largeur_poitrine", "unit": "cm", "label": "Largeur de poitrine"},
                {"name": "perimetre_scrotal", "unit": "cm", "label": "Périmètre scrotal"}
            ],
            "female": [
                {"name": "longueur_corps", "unit": "cm", "label": "Longueur du corps"},
                {"name": "hauteur_garrot", "unit": "cm", "label": "Hauteur au garrot"},
                {"name": "largeur_poitrine", "unit": "cm", "label": "Largeur de poitrine"}
            ],
            "udder_measures": [
                {"name": "profondeur_mamelle", "unit": "cm", "label": "Profondeur de la mamelle"},
                {"name": "hauteur_plancher", "unit": "cm", "label": "Hauteur du plancher"},
                {"name": "longueur_trayons", "unit": "cm", "label": "Longueur des trayons"},
                {"name": "diametre_trayons", "unit": "cm", "label": "Diamètre des trayons"},
                {"name": "placement_trayons", "unit": "code", "label": "Placement"},
                {"name": "score_symetrie", "unit": "1-5", "label": "Score de symétrie"},
                {"name": "sante_mamelle", "unit": "text", "label": "État de santé"}
            ]
        },
        "genetic_markers": [
            {"gene": "DGAT1", "trait": "Matière grasse du lait", "priority": "high"},
            {"gene": "GDF9", "trait": "Prolificité", "priority": "medium"}
        ],
        "carcass": {
            "formula": "ovine",
            "dressing_percent": 0.48,
            "bone_percent": 0.18,
            "fat_percent": 0.22,
            "muscle_percent": 0.60
        },
        "milk_reference": {"fat": 6.5, "protein": 5.8, "lactose": 4.5, "somatic_cells_threshold": 400000}
    },
    "bovin": {
        "name": "Bovin",
        "icon": "🐄",
        "category": "animal",
        "breeds": ["Locale", "Améliorée"],
        "life_stages": [
            {"id": "veau", "name": "Veau", "gender": "male"},
            {"id": "genisse", "name": "Génisse", "gender": "female"},
            {"id": "taureau", "name": "Taureau", "gender": "male"},
            {"id": "vache", "name": "Vache", "gender": "female"}
        ],
        "physiological_states": ["vide", "gestante", "allaitante", "lactation", "tarie"],
        "morphometrics": {
            "male": [
                {"name": "longueur_corps", "unit": "cm", "label": "Longueur du corps"},
                {"name": "hauteur_garrot", "unit": "cm", "label": "Hauteur au garrot"},
                {"name": "largeur_poitrine", "unit": "cm", "label": "Largeur de poitrine"},
                {"name": "perimetre_scrotal", "unit": "cm", "label": "Périmètre scrotal"}
            ],
            "female": [
                {"name": "longueur_corps", "unit": "cm", "label": "Longueur du corps"},
                {"name": "hauteur_garrot", "unit": "cm", "label": "Hauteur au garrot"},
                {"name": "largeur_poitrine", "unit": "cm", "label": "Largeur de poitrine"}
            ],
            "udder_measures": [
                {"name": "profondeur_mamelle", "unit": "cm", "label": "Profondeur de la mamelle"},
                {"name": "hauteur_plancher", "unit": "cm", "label": "Hauteur du plancher"},
                {"name": "longueur_trayons", "unit": "cm", "label": "Longueur des trayons"},
                {"name": "diametre_trayons", "unit": "cm", "label": "Diamètre des trayons"}
            ]
        },
        "genetic_markers": [
            {"gene": "DGAT1", "trait": "Matière grasse", "priority": "high"}
        ],
        "carcass": {
            "formula": "bovine",
            "dressing_percent": 0.55,
            "bone_percent": 0.16,
            "fat_percent": 0.20,
            "muscle_percent": 0.64
        },
        "milk_reference": {"fat": 4.0, "protein": 3.3, "lactose": 4.8, "somatic_cells_threshold": 200000}
    }
}

CARCASS_FORMULAS = {
    "ovine": {
        "muscle": lambda lw, bcs: 0.45 * lw * (1 + 0.02 * (bcs - 3)),
        "fat": lambda lw, bcs: 0.22 * lw * (1 + 0.05 * (bcs - 3)),
        "bone": lambda lw: 0.18 * lw
    },
    "bovine": {
        "muscle": lambda lw, bcs: 0.55 * lw,
        "fat": lambda lw, bcs: 0.20 * lw,
        "bone": lambda lw: 0.16 * lw
    }
}

# ------------------------------------------------------------
# DATABASE FUNCTIONS
# ------------------------------------------------------------
DB_PATH = "genapagie.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id TEXT PRIMARY KEY,
            species TEXT NOT NULL,
            breed TEXT,
            gender TEXT,
            life_stage TEXT,
            physiological_state TEXT,
            age_months INTEGER,
            weight_kg REAL,
            morphometrics TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS milk_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id TEXT NOT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            quantity_l REAL,
            protein REAL,
            fat REAL,
            dry_extract REAL,
            lactose REAL,
            ph REAL,
            density REAL,
            somatic_cells INTEGER,
            acidity REAL,
            fatty_acids TEXT,
            notes TEXT,
            FOREIGN KEY(subject_id) REFERENCES subjects(id)
        )
    ''')
    conn.commit()
    conn.close()

def add_subject(data):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO subjects (id, species, breed, gender, life_stage, physiological_state,
                              age_months, weight_kg, morphometrics, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'], data['species'], data.get('breed'), data.get('gender'),
        data.get('life_stage'), data.get('physiological_state'),
        data.get('age_months'), data.get('weight_kg'),
        json.dumps(data.get('morphometrics', {})), data.get('notes')
    ))
    conn.commit()
    conn.close()

def get_all_subjects():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM subjects')
    rows = c.fetchall()
    conn.close()
    columns = ['id', 'species', 'breed', 'gender', 'life_stage', 'physiological_state',
               'age_months', 'weight_kg', 'morphometrics', 'notes', 'created_at', 'updated_at']
    subjects = []
    for row in rows:
        subject = dict(zip(columns, row))
        subject['morphometrics'] = json.loads(subject['morphometrics']) if subject['morphometrics'] else {}
        subjects.append(subject)
    return subjects

def add_milk_record(record):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO milk_records (subject_id, quantity_l, protein, fat, dry_extract,
                                  lactose, ph, density, somatic_cells, acidity, fatty_acids, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        record['subject_id'], record.get('quantity_l'), record.get('protein'),
        record.get('fat'), record.get('dry_extract'), record.get('lactose'),
        record.get('ph'), record.get('density'), record.get('somatic_cells'),
        record.get('acidity'), json.dumps(record.get('fatty_acids', {})),
        record.get('notes')
    ))
    conn.commit()
    conn.close()

def get_milk_records(subject_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM milk_records WHERE subject_id = ? ORDER BY date', (subject_id,))
    rows = c.fetchall()
    conn.close()
    columns = ['id', 'subject_id', 'date', 'quantity_l', 'protein', 'fat', 'dry_extract',
               'lactose', 'ph', 'density', 'somatic_cells', 'acidity', 'fatty_acids', 'notes']
    records = []
    for row in rows:
        record = dict(zip(columns, row))
        record['fatty_acids'] = json.loads(record['fatty_acids']) if record['fatty_acids'] else {}
        records.append(record)
    return records

# ------------------------------------------------------------
# CONNECTIVITY
# ------------------------------------------------------------
def check_internet():
    try:
        requests.get("https://www.google.com", timeout=3)
        return True
    except:
        return False

# ------------------------------------------------------------
# MODULES (intégrés dans le même fichier)
# ------------------------------------------------------------

# ---- inventory ----
def inventory_app():
    st.title("📋 Registre Biométrique (Inventaire)")
    subjects = get_all_subjects()
    if not subjects:
        st.info("Aucun sujet enregistré.")
        return
    df = pd.DataFrame(subjects)
    display_cols = ['id', 'species', 'breed', 'gender', 'life_stage', 'physiological_state',
                    'age_months', 'weight_kg', 'notes']
    df_display = df[display_cols].copy()
    df_display['species'] = df_display['species'].map(lambda x: SPECIES.get(x, {}).get('name', x))
    st.dataframe(df_display, use_container_width=True)

# ---- biometry ----
def analyze_biometry_online(measurements, physiological_state, photos):
    return {"weight": 50, "bcs": 3.2, "udder_score": 4.0, "health_status": "Bon", "recommendations": "Rien"}

def analyze_biometry_offline(measurements, physiological_state, species):
    return {"weight": 48, "bcs": 3.0, "udder_score": 3.5, "health_status": "OK (offline)", "recommendations": "Analyse basique."}

def biometry_app():
    st.title("📏 Analyse Biométrique")
    online = st.session_state.get('online', False)
    st.caption(f"Mode : {'🌐 En ligne' if online else '📴 Hors ligne'}")

    species_keys = [k for k, v in SPECIES.items() if v['category'] in ['animal', 'insect']]
    species = st.selectbox("Espèce", species_keys, format_func=lambda x: f"{SPECIES[x]['icon']} {SPECIES[x]['name']}")
    species_info = SPECIES[species]
    breed = st.selectbox("Race", species_info['breeds'])
    life_stages = species_info['life_stages']
    life_stage = st.selectbox("Stade de vie", options=[ls['id'] for ls in life_stages],
                              format_func=lambda x: next(ls['name'] for ls in life_stages if ls['id']==x))
    selected_ls = next(ls for ls in life_stages if ls['id'] == life_stage)
    gender = selected_ls['gender']
    physio_state = st.selectbox("État physiologique", species_info.get('physiological_states', []))
    age_method = st.radio("Méthode d'âge", ["Mois", "Dentition"])
    if age_method == "Mois":
        age_months = st.number_input("Âge (mois)", min_value=0, step=1)
    else:
        dentition = st.selectbox("Dentition", ["2 dents", "4 dents", "6 dents", "adulte"])
        age_months = {"2 dents":12, "4 dents":24, "6 dents":36, "adulte":48}.get(dentition, 24)
    subject_id = st.text_input("ID (boucle/ruche/parcelle)")
    st.info("Fonctionnalité photo à implémenter.")
    morphometrics = {}
    base_measures = species_info['morphometrics'].get(gender, [])
    for m in base_measures:
        val = st.number_input(f"{m['label']} ({m['unit']})", step=0.1)
        morphometrics[m['name']] = val
    if gender == 'female' and physio_state in ['gestante', 'allaitante', 'lactation']:
        st.markdown("**Mesures mammaires**")
        udder = {}
        for m in species_info['morphometrics'].get('udder_measures', []):
            if m['unit'] == 'text':
                val = st.text_input(m['label'])
            else:
                val = st.number_input(f"{m['label']} ({m['unit']})", step=0.1)
            udder[m['name']] = val
        morphometrics['udder_measures'] = udder
    weight_kg = st.number_input("Poids vif (kg) - si connu", min_value=0.0, step=0.1)
    if st.button("Lancer l'analyse"):
        data = {
            'id': subject_id or f"{species}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'species': species,
            'breed': breed,
            'gender': gender,
            'life_stage': life_stage,
            'physiological_state': physio_state,
            'age_months': age_months,
            'weight_kg': weight_kg if weight_kg>0 else None,
            'morphometrics': morphometrics,
            'notes': ""
        }
        if online:
            result = analyze_biometry_online(morphometrics, physio_state, [])
        else:
            result = analyze_biometry_offline(morphometrics, physio_state, species)
        add_subject(data)
        st.success("Sujet enregistré !")
        st.subheader("Résultats")
        col1, col2, col3 = st.columns(3)
        col1.metric("Poids estimé", f"{result['weight']:.1f} kg")
        col2.metric("BCS", f"{result['bcs']:.1f}/5")
        if result.get('udder_score'):
            col3.metric("Score mammaire", f"{result['udder_score']:.1f}/5")
        st.info(f"**Santé** : {result['health_status']}")

# ---- milk tracking ----
def milk_tracking_app():
    st.title("🥛 Suivi Laitier")
    subjects = get_all_subjects()
    if not subjects:
        st.warning("Aucun sujet.")
        return
    milk_species = ['ovin', 'bovin', 'caprin', 'camelin']
    subject_options = {s['id']: f"{s['id']} - {SPECIES[s['species']]['name']} ({s['breed']})"
                       for s in subjects if s['species'] in milk_species}
    if not subject_options:
        st.warning("Aucun animal laitier.")
        return
    selected_id = st.selectbox("Choisir un animal", options=list(subject_options.keys()),
                               format_func=lambda x: subject_options[x])
    tab1, tab2 = st.tabs(["📝 Saisir un relevé", "📈 Visualisation"])
    with tab1:
        date = st.date_input("Date")
        quantity = st.number_input("Quantité (L)", min_value=0.0, step=0.1)
        protein = st.number_input("Protéines (g/L)", min_value=0.0, step=0.1)
        fat = st.number_input("Matière grasse (g/L)", min_value=0.0, step=0.1)
        with st.expander("Paramètres avancés"):
            dry_extract = st.number_input("Extrait sec (g/L)", min_value=0.0, step=0.1)
            lactose = st.number_input("Lactose (g/L)", min_value=0.0, step=0.1)
            ph = st.number_input("pH", min_value=0.0, max_value=14.0, step=0.1)
            density = st.number_input("Densité", min_value=1.0, step=0.001, format="%.3f")
            somatic_cells = st.number_input("Cellules somatiques (x1000/mL)", min_value=0, step=1)
            acidity = st.number_input("Acidité Dornic (°D)", min_value=0.0, step=0.1)
        notes = st.text_area("Notes")
        if st.button("Enregistrer"):
            record = {
                'subject_id': selected_id,
                'quantity_l': quantity,
                'protein': protein,
                'fat': fat,
                'dry_extract': dry_extract,
                'lactose': lactose,
                'ph': ph,
                'density': density,
                'somatic_cells': somatic_cells,
                'acidity': acidity,
                'fatty_acids': {},
                'notes': notes
            }
            add_milk_record(record)
            st.success("Relevé enregistré !")
    with tab2:
        records = get_milk_records(selected_id)
        if not records:
            st.info("Aucun relevé.")
        else:
            df = pd.DataFrame(records)
            df['date'] = pd.to_datetime(df['date'])
            df = df.sort_values('date')
            fig = px.line(df, x='date', y='quantity_l', title='Production laitière')
            st.plotly_chart(fig)
            comp_df = df[['date','protein','fat','lactose']].melt(id_vars='date', var_name='composant', value_name='taux')
            fig2 = px.line(comp_df, x='date', y='taux', color='composant', title='Composition')
            st.plotly_chart(fig2)

# ---- biolab ----
def calculate_gebv(subject, markers):
    return 100 + (subject.get('weight_kg', 50) * 0.1)

def biolab_app():
    st.title("🧬 Laboratoire Bio")
    species_keys = list(SPECIES.keys())
    species = st.selectbox("Espèce", species_keys, format_func=lambda x: f"{SPECIES[x]['icon']} {SPECIES[x]['name']}")
    species_info = SPECIES[species]
    st.subheader("Marqueurs d'intérêt")
    if species_info['genetic_markers']:
        st.dataframe(pd.DataFrame(species_info['genetic_markers']))
    else:
        st.info("Aucun marqueur.")
    online = st.session_state.get('online', False)
    if online:
        st.success("Mode online : recherche NCBI simulée.")
    st.subheader("Classement des élites")
    subjects = [s for s in get_all_subjects() if s['species'] == species]
    if not subjects:
        st.warning("Aucun sujet de cette espèce.")
        return
    for s in subjects:
        s['index'] = calculate_gebv(s, species_info['genetic_markers'])
    df = pd.DataFrame(subjects).sort_values('index', ascending=False)
    st.dataframe(df[['id','breed','gender','physiological_state','index']])
    if not df.empty:
        best = df.iloc[0]
        st.subheader(f"Profil du meilleur : {best['id']}")
        traits = {"Viande":80, "Lait":70, "Fertilité":90, "Santé":85}
        fig = px.line_polar(r=list(traits.values()), theta=list(traits.keys()), line_close=True)
        st.plotly_chart(fig)

# ---- diagnosis ----
def predict_offline(image, context):
    return {"maladie": "Mammite", "probabilite": 0.78, "conseils": "Surveiller."}
def predict_online(image, context):
    return {"maladie": "Mammite clinique", "probabilite": 0.92, "conseils": "Traitement."}

def diagnosis_app():
    st.title("🔍 Diagnostic IA par Photo")
    online = st.session_state.get('online', False)
    st.caption(f"Mode : {'🌐 En ligne' if online else '📴 Hors ligne'}")
    uploaded = st.file_uploader("Choisissez une photo", type=['jpg','jpeg','png'])
    if uploaded:
        image = Image.open(uploaded)
        st.image(image, caption="Photo", use_column_width=True)
        with st.expander("Informations contextuelles"):
            species = st.selectbox("Espèce", ["Ovin","Bovin","Plante"])
            physio = st.selectbox("État", ["normal","gestante","lactation"])
        if st.button("Lancer le diagnostic"):
            context = {"species": species, "physiological_state": physio}
            result = predict_online(image, context) if online else predict_offline(image, context)
            st.subheader("Résultat")
            st.write(f"**Maladie** : {result['maladie']}")
            st.write(f"**Probabilité** : {result['probabilite']*100:.1f}%")
            st.info(f"**Conseils** : {result['conseils']}")

# ---- carcass ----
def carcass_app():
    st.title("🥩 Estimation Carcasse")
    method = st.radio("Méthode", ["Choisir un animal existant", "Saisie manuelle"])
    if method == "Choisir un animal existant":
        subjects = get_all_subjects()
        meat_species = ['ovin','bovin','caprin','camelin','poulet_viande','lapin']
        subjects = [s for s in subjects if s['species'] in meat_species]
        if not subjects:
            st.warning("Aucun animal à viande.")
            return
        opt = {s['id']: f"{s['id']} - {SPECIES[s['species']]['name']}" for s in subjects}
        sel = st.selectbox("Sélectionner", options=list(opt.keys()), format_func=lambda x: opt[x])
        subj = next(s for s in subjects if s['id']==sel)
        live_weight = subj.get('weight_kg')
        species = subj['species']
        gender = subj['gender']
        physio = subj['physiological_state']
        age = subj['age_months']
        bcs = 3.0
    else:
        species_keys = [k for k,v in SPECIES.items() if v['category']=='animal']
        species = st.selectbox("Espèce", species_keys, format_func=lambda x: SPECIES[x]['name'])
        gender = st.selectbox("Sexe", ["male","female"])
        physio = st.selectbox("État", SPECIES[species].get('physiological_states',[]))
        live_weight = st.number_input("Poids vif (kg)", min_value=0.1, step=0.1)
        age = st.number_input("Âge (mois)", min_value=0, step=1)
        bcs = st.slider("Note d'état corporel (1-5)", 1.0, 5.0, 3.0, 0.5)
    if st.button("Estimer"):
        species_info = SPECIES[species]
        carcass_params = species_info.get('carcass')
        if not carcass_params:
            st.error("Pas de paramètres.")
            return
        formula_key = carcass_params.get('formula')
        if formula_key in CARCASS_FORMULAS:
            formula = CARCASS_FORMULAS[formula_key]
            muscle = formula['muscle'](live_weight, bcs)
            fat = formula['fat'](live_weight, bcs)
            bone = formula['bone'](live_weight)
        else:
            muscle = live_weight * carcass_params['muscle_percent']
            fat = live_weight * carcass_params['fat_percent']
            bone = live_weight * carcass_params['bone_percent']
        carcass_weight = muscle+fat+bone
        dressing = carcass_weight/live_weight if live_weight>0 else 0
        st.subheader("Résultats")
        col1,col2,col3 = st.columns(3)
        col1.metric("Poids carcasse", f"{carcass_weight:.1f} kg", f"{dressing*100:.1f}%")
        col2.metric("Viande", f"{muscle:.1f} kg", f"{muscle/carcass_weight*100:.1f}%")
        col3.metric("Gras", f"{fat:.1f} kg", f"{fat/carcass_weight*100:.1f}%")
        st.metric("Os", f"{bone:.1f} kg", f"{bone/carcass_weight*100:.1f}%")
        fig = go.Figure(data=[go.Pie(labels=["Viande","Gras","Os"], values=[muscle,fat,bone], hole=0.3)])
        st.plotly_chart(fig)

# ---- dashboard ----
def dashboard_app():
    st.title("📊 Tableau de Bord")
    subjects = get_all_subjects()
    if not subjects:
        st.info("Aucune donnée.")
        return
    df = pd.DataFrame(subjects)
    col1,col2,col3 = st.columns(3)
    col1.metric("Total sujets", len(df))
    col2.metric("Espèces", df['species'].nunique())
    col3.metric("Âge moyen", f"{df['age_months'].mean():.1f} mois")
    sp_counts = df['species'].value_counts().reset_index()
    sp_counts.columns = ['species','count']
    sp_counts['species'] = sp_counts['species'].map(lambda x: SPECIES.get(x,{}).get('name',x))
    fig = px.bar(sp_counts, x='species', y='count', title="Effectifs par espèce")
    st.plotly_chart(fig)
    animal_df = df[df['species'].isin([k for k,v in SPECIES.items() if v['category']=='animal'])]
    if not animal_df.empty:
        state_counts = animal_df['physiological_state'].value_counts().reset_index()
        state_counts.columns = ['state','count']
        fig2 = px.pie(state_counts, values='count', names='state', title="États physiologiques")
        st.plotly_chart(fig2)

# ---- species management ----
def species_management_app():
    st.title("🐾 Gestion des Espèces (Référence)")
    species_keys = list(SPECIES.keys())
    species = st.selectbox("Choisir une espèce", species_keys,
                           format_func=lambda x: f"{SPECIES[x]['icon']} {SPECIES[x]['name']}")
    info = SPECIES[species]
    st.subheader("Caractéristiques")
    st.write(f"**Catégorie** : {info['category']}")
    st.write(f"**Races** : {', '.join(info['breeds'])}")
    st.write(f"**Stades** : {', '.join([ls['name'] for ls in info['life_stages']])}")
    st.write(f"**États** : {', '.join(info.get('physiological_states',[]))}")
    st.subheader("Mesures morphométriques")
    for g, measures in info['morphometrics'].items():
        if g != 'udder_measures':
            st.markdown(f"**{g}**")
            for m in measures:
                st.write(f"- {m['label']} ({m['unit']})")
    if 'udder_measures' in info['morphometrics']:
        st.markdown("**Mesures mammaires**")
        for m in info['morphometrics']['udder_measures']:
            st.write(f"- {m['label']} ({m['unit']})")
    if info.get('genetic_markers'):
        st.subheader("Marqueurs génétiques")
        st.dataframe(pd.DataFrame(info['genetic_markers']))

# ------------------------------------------------------------
# MAIN APP
# ------------------------------------------------------------
def main():
    st.set_page_config(page_title="GenApAgiE", layout="wide")
    init_db()
    if "online" not in st.session_state:
        st.session_state.online = check_internet()

    with st.sidebar:
        st.image("https://via.placeholder.com/150x50?text=GenApAgiE", width=150)
        st.title("GENAPAGIE")
        st.caption("Multi-Espèces Pro")
        st.divider()
        st.subheader("EXPLOITANT ACTIF")
        st.text("Rahim")
        st.subheader("ESPÈCE FILTRÉE")
        species_filter = st.selectbox(
            "",
            ["Toutes les espèces"] + list(SPECIES.keys()),
            format_func=lambda x: SPECIES[x]["name"] if x != "Toutes les espèces" else "Toutes les espèces"
        )
        st.session_state['species_filter'] = species_filter
        st.divider()
        online = st.session_state.online
        st.caption(f"🌐 Connecté" if online else "📴 Hors ligne")
        if st.button("Rafraîchir connexion"):
            st.session_state.online = check_internet()
            st.rerun()
        menu = [
            "Tableau de Bord",
            "Gestion des Espèces",
            "Archives Globales",
            "Analyse IA",
            "Laboratoire Bio",
            "Intelligence ML",
            "Inventaire Local",
            "Nutrition & Sol",
            "Santé & Phytosanitaire",
            "Reproduction & Semis",
            "Production & Récolte",
            "Estimation Carcasse",
            "Exploitants",
            "Aide & Partage"
        ]
        choice = st.radio("Menu", menu)

    if choice == "Tableau de Bord":
        dashboard_app()
    elif choice == "Gestion des Espèces":
        species_management_app()
    elif choice == "Archives Globales":
        st.title("Archives Globales - en développement")
    elif choice == "Analyse IA":
        biometry_app()
    elif choice == "Laboratoire Bio":
        biolab_app()
    elif choice == "Intelligence ML":
        st.title("Intelligence ML - utilisez Diagnostic IA")
    elif choice == "Inventaire Local":
        inventory_app()
    elif choice == "Nutrition & Sol":
        st.title("Nutrition & Sol - en développement")
    elif choice == "Santé & Phytosanitaire":
        st.title("Santé & Phytosanitaire - en développement")
    elif choice == "Reproduction & Semis":
        st.title("Reproduction & Semis - en développement")
    elif choice == "Production & Récolte":
        st.title("Production & Récolte - en développement")
    elif choice == "🥩 Estimation Carcasse":
        carcass_app()
    elif choice == "Exploitants":
        st.title("Exploitants - en développement")
    elif choice == "Aide & Partage":
        st.title("Aide & Partage - en développement")

if __name__ == "__main__":
    main()
