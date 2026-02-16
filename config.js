// config.js
const LOCAL_API = "http://localhost:5000/api";
const LIVE_API  = "https://smartlearn-backend-3.onrender.com/api";

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export const API_BASE = isLocal ? LOCAL_API : LIVE_API;
