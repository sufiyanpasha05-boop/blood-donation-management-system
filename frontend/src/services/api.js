
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5002/api",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;
