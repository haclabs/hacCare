import streamlit as st
import os
import json
import hashlib
from datetime import date, datetime
import pandas as pd
from io import BytesIO

# ─── RERUN HELPER ────────────────────────────────────────────────────────────
def rerun():
    try:
        st.experimental_rerun()
    except Exception:
        pass

# ─── PAGE CONFIG ─────────────────────────────────────────────────────────────

APP_VERSION = "1.5"

st.set_page_config(page_title="hacCare (JSON)", layout="wide", page_icon="🩺")

# ─── AUTHENTICATION SETUP ─────────────────────────────────────────────────────
USERS_FILE = "users.json"

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def load_users() -> dict:
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump({"admin": {"password": hash_password("haccare")}}, f, indent=2)
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Normalize and hash plaintext
    changed = False
    for u, info in list(data.items()):
        if not isinstance(info, dict):
            data[u] = {"password": str(info)}
            changed = True
        pw = data[u]["password"]
        if len(pw) != 64:
            data[u]["password"] = hash_password(pw)
            changed = True
    if changed:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    return {u.lower(): info for u, info in data.items()}

users = load_users()

def verify_password(user: str, pw: str) -> bool:
    rec = users.get(user.strip().lower())
    return isinstance(rec, dict) and rec.get("password") == hash_password(pw)

# ─── SESSION STATE ───────────────────────────────────────────────────────────
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
if "current_user" not in st.session_state:
    st.session_state.current_user = None
if "open_rec" not in st.session_state:
    st.session_state.open_rec = None

# ─── LANDING / LOGIN PAGE ─────────────────────────────────────────────────────
if not st.session_state.authenticated:
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown(
    f"<h1 style='text-align:center; font-family:Helvetica, Arial, sans-serif; font-weight:600;'>Welcome to hacCare v{APP_VERSION}</h1>",
    unsafe_allow_html=True
)
        username = st.text_input("Username", key="login_user")
        password = st.text_input("Password", type="password", key="login_pwd")
        if st.button("🔐 Log In"):
            if verify_password(username, password):
                st.session_state.authenticated = True
                st.session_state.current_user = username
                rerun()
            else:
                st.error("❌ Invalid username or password")
    st.stop()

# ─── LOGOUT ──────────────────────────────────────────────────────────────────
if st.sidebar.button("Logout"):
    st.session_state.authenticated = False
    st.session_state.current_user = None
    rerun()

# ─── STORAGE ──────────────────────────────────────────────────────────────────
RECORDS_DIR = "Records"
os.makedirs(RECORDS_DIR, exist_ok=True)

def record_path(rid: str) -> str:
    return os.path.join(RECORDS_DIR, f"record_{rid}.json")

def load_patient(rid: str) -> dict:
    path = record_path(rid)
    return json.load(open(path, "r")) if os.path.exists(path) else {}

def save_patient(rid: str, data: dict):
    with open(record_path(rid), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# ─── NAVIGATION ───────────────────────────────────────────────────────────────
st.sidebar.title(f"👤 {st.session_state.current_user}")
options = ["🏠 Home", "➕ Add/Edit Record", "📋 All Records", "📄 Documentation", "🕒 Changelog"]
def_index = 1 if st.session_state.open_rec else 0
menu = st.sidebar.radio("Navigate", options, index=def_index, key="menu")
if st.session_state.open_rec and menu == "➕ Add/Edit Record":
    st.session_state.open_rec = None

# ─── HOME ─────────────────────────────────────────────────────────────────────
if menu == "🏠 Home":
    st.title("View Patient Record")
    rid = st.text_input("Record #", key="home_rec")
    if rid:
        data = load_patient(rid)
        if data:
            tabs = st.tabs(["Info","MAR","Vitals","Labels"])
            with tabs[0]:
                st.table({
                    k: data.get(k,"") for k in [
                        "Patient Name","Patient ID","Date of Birth","Gender",
                        "Admission Date","Attending Physician","Diagnosis","Allergies/Reactions"
                    ]
                })
                if notes := data.get("Notes"): st.markdown(f"**Notes:**  \n{notes}")
            with tabs[1]:
                raw = data.get("MAR", {})
                for section, cols in [("Scheduled",["Medication","Time","Given"]), ("PRN",["Medication","Time","Given"]), ("IV",["Type","Rate","Time","Given"])]:
                    st.subheader(section)
                    df = pd.DataFrame(raw.get(section,[])).reindex(columns=cols, fill_value="").astype(str)
                    st.write(df)
            with tabs[2]:
                vitals = data.get("Vitals", [])
                if vitals:
                    dfv = pd.DataFrame(vitals)
                    dfv["DateTime"] = pd.to_datetime(dfv["DateTime"])  
                    dfv = dfv.sort_values("DateTime").tail(5)
                    st.dataframe(dfv[["DateTime","Systolic","Diastolic","Pulse","Temperature"]])
                    st.line_chart(dfv.set_index("DateTime")[['Systolic','Diastolic','Pulse','Temperature']])
                else:
                    st.info("No vitals recorded.")
            with tabs[3]:
                try:
                    from barcode import Code128
                    from barcode.writer import ImageWriter
                    buf = BytesIO()
                    Code128(rid, writer=ImageWriter()).write(buf)
                    buf.seek(0)
                    st.image(buf, width=150)
                except:
                    st.error("Barcode failed.")
        else:
            st.warning("Record not found.")

# ─── ADD/EDIT RECORD ─────────────────────────────────────────────────────────
elif menu == "➕ Add/Edit Record":
    st.title("Add / Edit Patient Record")
    rec_id = st.text_input("Record #", value=st.session_state.open_rec or "", key="edit_rec")
    data = load_patient(rec_id) if rec_id else {}
    tabs = st.tabs(["Info","MAR","Vitals","Labels"])

    with tabs[0]:
        name = st.text_input("Patient Name", data.get("Patient Name",""))
        dob = st.date_input("Date of Birth", value=date.fromisoformat(data.get("Date of Birth", date.today().isoformat())), min_value=date(1900,1,1))
        adm = st.date_input("Admission Date", value=date.fromisoformat(data.get("Admission Date", date.today().isoformat())), min_value=date(1900,1,1))
        gender = st.selectbox("Gender", ["Male","Female","Other"], index=["Male","Female","Other"].index(data.get("Gender","Male")))
        physician = st.selectbox("Attending Physician", ["Dr. Buggler","Dr. Elliot","Dr. Tyrell"], index=["Dr. Buggler","Dr. Elliot","Dr. Tyrell"].index(data.get("Attending Physician","Dr. Buggler")))
        diagnosis = st.text_input("Diagnosis", data.get("Diagnosis",""))
        allergies = st.text_input("Allergies/Reactions", data.get("Allergies/Reactions",""))
        notes = st.text_area("Notes", data.get("Notes",""))

    with tabs[1]:
        raw = data.get("MAR", {})
        df_s = pd.DataFrame(raw.get("Scheduled",[])).reindex(columns=["Medication","Time","Given"], fill_value="").astype(str)
        sched = st.data_editor(df_s, num_rows="dynamic", key="edit_sched")
        df_p = pd.DataFrame(raw.get("PRN",[])).reindex(columns=["Medication","Time","Given"], fill_value="").astype(str)
        prn = st.data_editor(df_p, num_rows="dynamic", key="edit_prn")
        df_iv = pd.DataFrame(raw.get("IV",[])).reindex(columns=["Type","Rate","Time","Given"], fill_value="").astype(str)
        iv = st.data_editor(df_iv, num_rows="dynamic", key="edit_iv")

    with tabs[2]:
        vitals = data.get("Vitals", [])
        last = vitals[-1] if vitals else {}
        sys_bp = st.number_input("Systolic BP", min_value=0, max_value=300, value=last.get("Systolic",120), key="v_sys")
        dia_bp = st.number_input("Diastolic BP", min_value=0, max_value=200, value=last.get("Diastolic",80), key="v_dia")
        pulse = st.number_input("Pulse", min_value=0, max_value=200, value=last.get("Pulse",70), key="v_pulse")
        temp = st.number_input("Temperature (°C)", min_value=30.0, max_value=45.0, value=last.get("Temperature",37.0), step=0.1, key="v_temp")

    with tabs[3]:
        if rec_id:
            try:
                from barcode import Code128
                from barcode.writer import ImageWriter
                buf = BytesIO()
                Code128(rec_id, writer=ImageWriter()).write(buf)
                buf.seek(0)
                st.image(buf, width=150)
            except:
                st.error("Barcode failed.")

    if st.button("Save Record"):
        # auto ID
        if not rec_id:
            existing = [int(f.replace("record_","").replace(".json","")) for f in os.listdir(RECORDS_DIR) if f.startswith("record_")]
            rec_id = str(max(existing)+1 if existing else 1).zfill(4)
        # compile record
        record = {
            "Patient Name": name,
            "Patient ID": rec_id,
            "Date of Birth": dob.isoformat(),
            "Admission Date": adm.isoformat(),
            "Gender": gender,
            "Attending Physician": physician,
            "Diagnosis": diagnosis,
            "Allergies/Reactions": allergies,
            "Notes": notes,
            "MAR": {
                "Scheduled": sched.to_dict("records"),
                "PRN": prn.to_dict("records"),
                "IV": iv.to_dict("records")
            },
            "Vitals": vitals + [{
                "Systolic": sys_bp,
                "Diastolic": dia_bp,
                "Pulse": pulse,
                "Temperature": temp,
                "DateTime": datetime.now().isoformat()
            }]
        }
        save_patient(rec_id, record)
        st.success(f"Saved record {rec_id}")
        st.session_state.open_rec = rec_id
        rerun()

# ─── ALL RECORDS ─────────────────────────────────────────────────────────────
elif menu == "📋 All Records":
    st.title("All Patient Records")
    for f in sorted([f for f in os.listdir(RECORDS_DIR) if f.startswith("record_")]):
        rid = f.split("_")[1].split(".")[0]
        name = load_patient(rid).get("Patient Name","(No Name)")
        cols = st.columns([5,1,1])
        cols[0].write(f"{name} ({rid})")
        if cols[1].button("Open", key=f"open_{rid}"):
            st.session_state.open_rec = rid
            rerun()
        if cols[2].button("Delete", key=f"del_{rid}"):
            os.remove(record_path(rid))
            st.success("Deleted record")
            rerun()

# ─── DOCUMENTATION ──────────────────────────────────────────────────────────
elif menu == "📄 Documentation":
    st.title("Documentation")
    st.markdown(
        """
**hacCare JSON Patient Records System**

- Secure username/password login
- JSON storage in `Records/`
- Tabs: Info, MAR, Vitals, Labels
- Editable MAR tables
- Vitals history (last 5)
- Auto 4-digit IDs
- Barcode label generation
"""
    )

# ─── CHANGELOG ──────────────────────────────────────────────────────────────
elif menu == "🕒 Changelog":
    st.title("Changelog")
    st.markdown(
        """
- v1.5: MAR & Vitals editing fixed
- v1.4: Vitals last 5 logic
- v1.3: Add/Edit redesign
- v1.2: Barcode labels
- v1.1: Login/Logout
"""
    )
