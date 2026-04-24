import React, { useState } from "react";
import { useAuth } from "../state/auth";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("valdez.victor@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(email, password);
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Invalid credentials or server error");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Login</h1>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", width: "300px" }}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" style={{ marginTop: "1rem" }}>Sign In</button>
      </form>
    </div>
  );
};

