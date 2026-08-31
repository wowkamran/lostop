import streamlit as st
import requests
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="Lostop Dashboard", page_icon="🛑", layout="wide")

API_URL = "http://localhost:8000/incidents"

st.title("🛑 Lostop — Security Dashboard")
st.caption("Live feed of blocked data-leak attempts")

try:
    response = requests.get(API_URL, timeout=3)
    incidents = response.json()
except Exception as e:
    st.error(f"Could not reach the Lostop server at {API_URL}. Is it running?")
    st.stop()

if not incidents:
    st.info("No incidents recorded yet. Try triggering a block from the extension.")
    st.stop()

df = pd.DataFrame(incidents)
df["timestamp"] = pd.to_datetime(df["timestamp"])

col1, col2, col3 = st.columns(3)
col1.metric("Total incidents", len(df))
col2.metric("Unique secret types", df["reason"].nunique())
col3.metric("Last incident", df["timestamp"].max().strftime("%Y-%m-%d %H:%M"))

st.subheader("Incidents by type")
type_counts = df["reason"].value_counts().reset_index()
type_counts.columns = ["reason", "count"]
fig = px.bar(type_counts, x="reason", y="count")
st.plotly_chart(fig, use_container_width=True)

st.subheader("Recent incidents")
st.dataframe(
    df[["timestamp", "reason", "snippet_masked"]].sort_values("timestamp", ascending=False),
    use_container_width=True
)
