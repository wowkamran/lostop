import streamlit as st
import requests
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta

st.set_page_config(page_title="Lostop Dashboard", page_icon="🛑", layout="wide")

API_URL = "http://localhost:8000/incidents"

st.title("🛑 Lostop — Security Dashboard")
st.caption("Live feed of blocked data-leak attempts")

try:
    response = requests.get(API_URL, timeout=3)
    incidents = response.json()
except Exception:
    st.error(f"Could not reach the Lostop server at {API_URL}. Is it running?")
    st.stop()

if not incidents:
    st.info("No incidents recorded yet. Try triggering a block from the extension.")
    st.stop()

df = pd.DataFrame(incidents)
df["timestamp"] = pd.to_datetime(df["timestamp"])
df["date"] = df["timestamp"].dt.date

# ---- Time period filter ----
st.sidebar.header("Filters")
period = st.sidebar.selectbox(
    "Time period",
    ["Today", "Last 7 days", "Last 30 days", "All time"],
    index=3
)

now = datetime.now()
if period == "Today":
    cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0)
elif period == "Last 7 days":
    cutoff = now - timedelta(days=7)
elif period == "Last 30 days":
    cutoff = now - timedelta(days=30)
else:
    cutoff = None

if cutoff:
    df_filtered = df[df["timestamp"] >= cutoff]
else:
    df_filtered = df

if df_filtered.empty:
    st.warning(f"No incidents in the selected period ({period}).")
    st.stop()

# ---- Metrics ----
col1, col2, col3 = st.columns(3)
col1.metric("Total incidents", len(df_filtered))
col2.metric("Unique secret types", df_filtered["reason"].nunique())
col3.metric("Last incident", df_filtered["timestamp"].max().strftime("%Y-%m-%d %H:%M"))

# ---- Incidents over time (daily) ----
st.subheader("Incidents over time")
daily_counts = df_filtered.groupby("date").size().reset_index(name="count")
fig_timeline = px.bar(daily_counts, x="date", y="count")
fig_timeline.update_layout(xaxis_title="Date", yaxis_title="Blocked attempts")
st.plotly_chart(fig_timeline, use_container_width=True)

# ---- Incidents by type ----
st.subheader("Incidents by type")
type_counts = df_filtered["reason"].value_counts().reset_index()
type_counts.columns = ["reason", "count"]
fig_types = px.bar(type_counts, x="reason", y="count")
st.plotly_chart(fig_types, use_container_width=True)

# ---- Recent incidents table ----
st.subheader("Recent incidents")
st.dataframe(
    df_filtered[["timestamp", "reason", "snippet_masked"]].sort_values("timestamp", ascending=False),
    use_container_width=True
)
